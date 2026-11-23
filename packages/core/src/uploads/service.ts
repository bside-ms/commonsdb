/*
 * Uploads (ROADMAP 6c, ARCHITECTURE "Uploads"). Core stores, opens and
 * deletes them; the bytes live in a FileStorage the app passes in, like
 * `db`. Other services build on this: a task image (step 2) and a
 * profile picture (step 3) call storeUpload within their own save.
 *
 * Who may see an upload follows from what references it (canViewUpload).
 */
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { profile, suggestion, task, taskSeries, upload, uploadFile } from '@commonsdb/db/schema';
import {
	MediaError,
	processUpload,
	type ByteRange,
	type FileStorage,
	type UploadKind
} from '@commonsdb/media';
import { DomainError, ValidationError } from '../errors.ts';
import { isAdmin, isSuperadmin, type Actor } from '../roles.ts';
import { maySeePhoto } from '../profile/photo.ts';
import { manageableCategories } from '../tasks/policy.ts';

export type UploadInput = {
	/** The file's bytes. */
	data: Uint8Array;
	/** As the uploader named it (kept for downloads, never trusted for the type). */
	name?: string | null;
};

export type UploadView = {
	id: string;
	kind: UploadKind;
	/** Stored variants with their pixel size (images), for `<img width height>`. */
	variants: Record<string, { width: number | null; height: number | null }>;
};

/** A file ready to send: what /media serves. */
export type OpenedUpload = {
	kind: UploadKind;
	mime: string;
	/** Size of the whole variant. */
	size: number;
	body: ReadableStream<Uint8Array>;
	originalName: string | null;
	/** Stable per upload and variant: the stored bytes never change. */
	etag: string;
};

/** `ab/<uuid>/large.webp`: sharded by the first two characters, so no directory gets huge. */
const storageKey = (id: string, variant: string, ext: string) =>
	`${id.slice(0, 2)}/${id}/${variant}.${ext}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VARIANT = /^[a-z][a-z0-9-]{0,30}$/;

// ---- storing ------------------------------------------------------------------

/**
 * Check, process and store an upload. Files are written first, rows
 * second; if the rows fail, the files are removed again, so storage never
 * holds files the database doesn't know (the opposite, a row without its
 * file, can't happen either).
 *
 * Errors come back as a ValidationError on `field`, so a form can show
 * them next to its file input: upload_empty, upload_too_large,
 * upload_type_unsupported, upload_unreadable.
 */
export async function storeUpload(
	db: Db,
	storage: FileStorage,
	actor: Actor,
	input: UploadInput,
	{ allow, field = 'file' }: { allow?: readonly UploadKind[]; field?: string } = {}
): Promise<UploadView> {
	let processed;
	try {
		processed = await processUpload(input.data, { allow });
	} catch (e) {
		if (e instanceof MediaError) throw new ValidationError({ [field]: e.code });
		throw e;
	}

	const id = randomUUID();
	const files = processed.variants.map((v) => ({ ...v, key: storageKey(id, v.name, v.ext) }));
	await Promise.all(files.map((f) => storage.put(f.key, f.data)));

	try {
		await db.transaction(async (tx) => {
			await tx.insert(upload).values({
				id,
				kind: processed.kind,
				mime: processed.mime,
				originalName: cleanName(input.name),
				bytes: input.data.length,
				meta: processed.meta,
				uploadedBy: actor.id
			});
			await tx.insert(uploadFile).values(
				files.map((f) => ({
					uploadId: id,
					variant: f.name,
					storageKey: f.key,
					mime: f.mime,
					bytes: f.data.length,
					width: f.width ?? null,
					height: f.height ?? null
				}))
			);
		});
	} catch (e) {
		await Promise.all(files.map((f) => storage.delete(f.key).catch(() => {})));
		throw e;
	}

	return {
		id,
		kind: processed.kind,
		variants: Object.fromEntries(
			files.map((f) => [f.name, { width: f.width ?? null, height: f.height ?? null }])
		)
	};
}

/** File names are shown to people later: no paths, no control characters, not endless. */
function cleanName(name: string | null | undefined) {
	const base = (name ?? '')
		.split(/[\\/]/)
		.pop()!
		.replace(/[\x00-\x1f\x7f]/g, '')
		.trim();
	return base ? base.slice(0, 200) : null;
}

// ---- reading ------------------------------------------------------------------

/** Variant sizes of an upload, for rendering; null when it doesn't exist. */
export async function getUploadView(db: Db, id: string): Promise<UploadView | null> {
	if (!UUID.test(id)) return null;
	const row = await db.query.upload.findFirst({
		where: eq(upload.id, id),
		columns: { id: true, kind: true },
		with: { files: { columns: { variant: true, width: true, height: true } } }
	});
	if (!row) return null;
	return {
		id: row.id,
		kind: row.kind,
		variants: Object.fromEntries(
			row.files.map((f) => [f.variant, { width: f.width, height: f.height }])
		)
	};
}

/**
 * Who may see an upload. Decided by what references it; each feature
 * that references uploads adds its rule here:
 *
 *   - a profile picture: its owner, else by photo visibility. Checked
 *     first: 'nobody' means nobody, superadmins included
 *   - the uploader, and superadmins
 *   - a task's or series' photo: every signed-in member
 *   - a suggestion's photo: the admins who may handle that suggestion
 *
 * Everything else, e.g. an upload nothing references any more: nobody else.
 */
export async function canViewUpload(db: Db, actor: Actor, id: string): Promise<boolean> {
	const owner = await db.query.profile.findFirst({
		where: eq(profile.photoId, id),
		columns: { userId: true, photoVisibility: true }
	});
	if (owner) return maySeePhoto(actor, owner);
	if (isSuperadmin(actor)) return true;
	const row = await db.query.upload.findFirst({
		where: eq(upload.id, id),
		columns: { uploadedBy: true }
	});
	if (!row) return false;
	if (row.uploadedBy === actor.id) return true;
	return (await isTaskImage(db, id)) || isHandleableSuggestionImage(db, actor, id);
}

/**
 * A task or series uses it as its photo. Every member may see those: the
 * task list is open to all of them (also deleted tasks' photos, which only
 * admins can still reach by URL; nothing private in a task photo).
 */
async function isTaskImage(db: Db, id: string): Promise<boolean> {
	const [hit] = await db
		.select({ id: task.id })
		.from(task)
		.where(eq(task.imageId, id))
		.unionAll(db.select({ id: taskSeries.id }).from(taskSeries).where(eq(taskSeries.imageId, id)))
		.limit(1);
	return hit !== undefined;
}

/** Admins see the photo of a suggestion in their scope (uncategorised: all admins). */
async function isHandleableSuggestionImage(db: Db, actor: Actor, id: string) {
	if (!isAdmin(actor)) return false;
	const s = await db.query.suggestion.findFirst({
		where: eq(suggestion.imageId, id),
		columns: { categoryId: true }
	});
	if (!s) return false;
	const scope = await manageableCategories(db, actor);
	return scope === 'all' || s.categoryId === null || scope.includes(s.categoryId);
}

/**
 * Open one variant for sending. Missing upload, missing variant and "not
 * allowed" all answer `upload_not_found`: a URL must not reveal that a
 * file exists. RangeError('range_not_satisfiable') for a bad range.
 */
export async function openUpload(
	db: Db,
	storage: FileStorage,
	actor: Actor,
	id: string,
	variant: string,
	{ range }: { range?: ByteRange } = {}
): Promise<OpenedUpload> {
	if (!UUID.test(id) || !VARIANT.test(variant)) throw new DomainError('upload_not_found');
	if (!(await canViewUpload(db, actor, id))) throw new DomainError('upload_not_found');

	const row = await db.query.upload.findFirst({
		where: eq(upload.id, id),
		columns: { kind: true, originalName: true },
		with: { files: { where: eq(uploadFile.variant, variant) } }
	});
	const file = row?.files[0];
	if (!row || !file) throw new DomainError('upload_not_found');

	const stored = await storage.get(file.storageKey, { range });
	if (!stored) throw new DomainError('upload_not_found');

	return {
		kind: row.kind,
		mime: file.mime,
		size: stored.size,
		body: stored.body,
		originalName: row.originalName,
		etag: `"${id}-${variant}"`
	};
}

// ---- deleting -----------------------------------------------------------------

/**
 * Remove an upload and its files. For callers that know nothing else
 * references it (a replaced profile picture). Shared uploads (task images
 * used by series and duplicates) are left for the cleanup job instead.
 */
export async function deleteUpload(db: Db, storage: FileStorage, id: string) {
	const files = await db
		.select({ key: uploadFile.storageKey })
		.from(uploadFile)
		.where(eq(uploadFile.uploadId, id));
	await db.delete(upload).where(eq(upload.id, id)); // upload_file rows cascade
	await Promise.all(files.map((f) => storage.delete(f.key)));
}
