import assert from 'node:assert/strict';
import { after, beforeEach, describe, test } from 'node:test';
import sharp from 'sharp';
import { createTestDb, insertUser } from '@commonsdb/db/testing';
import { upload, uploadFile } from '@commonsdb/db/schema';
import { createMemoryStorage, type FileStorage } from '@commonsdb/media';
import { DomainError, ValidationError } from '../errors.ts';
import type { Actor } from '../roles.ts';
import { canViewUpload, deleteUpload, getUploadView, openUpload, storeUpload } from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

let storage: ReturnType<typeof createMemoryStorage>;
let kim: Actor, lu: Actor, sa: Actor;

beforeEach(async () => {
	await t.reset();
	storage = createMemoryStorage();
	kim = await insertUser(db, { id: 'kim' });
	lu = await insertUser(db, { id: 'lu' });
	sa = await insertUser(db, { id: 'sa', role: 'superadmin' });
});

const jpeg = async (w = 2400, h = 1800) =>
	new Uint8Array(
		await sharp({ create: { width: w, height: h, channels: 3, background: '#a6e3a1' } })
			.jpeg()
			.toBuffer()
	);

const read = async (s: ReadableStream<Uint8Array>) =>
	new Uint8Array(await new Response(s).arrayBuffer());

async function fieldError(p: Promise<unknown>) {
	try {
		await p;
	} catch (e) {
		if (e instanceof ValidationError) return e.fields;
		throw e;
	}
	assert.fail('expected a ValidationError');
}

const notFound = (p: Promise<unknown>) =>
	assert.rejects(p, (e) => e instanceof DomainError && e.code === 'upload_not_found');

describe('storeUpload', () => {
	test('stores variants and rows; the original is not kept', async () => {
		const data = await jpeg();
		const view = await storeUpload(db, storage, kim, { data, name: 'C:\\Fotos\\hecke.jpg' });

		assert.equal(view.kind, 'image');
		assert.deepEqual(view.variants, {
			large: { width: 1600, height: 1200 },
			thumb: { width: 480, height: 360 }
		});
		assert.deepEqual([...storage.files.keys()].sort(), [
			`${view.id.slice(0, 2)}/${view.id}/large.webp`,
			`${view.id.slice(0, 2)}/${view.id}/thumb.webp`
		]);

		const [row] = await db.select().from(upload);
		assert.equal(row.mime, 'image/jpeg');
		assert.equal(row.bytes, data.length);
		assert.equal(row.originalName, 'hecke.jpg', 'path stripped');
		assert.equal(row.uploadedBy, 'kim');
		assert.deepEqual(row.meta, { width: 2400, height: 1800 });
		assert.equal((await db.select().from(uploadFile)).length, 2);
	});

	test('problems come back as a code on the form field', async () => {
		assert.deepEqual(
			await fieldError(storeUpload(db, storage, kim, { data: new TextEncoder().encode('hi') })),
			{ file: 'upload_type_unsupported' }
		);
		assert.deepEqual(
			await fieldError(
				storeUpload(db, storage, kim, { data: new Uint8Array() }, { field: 'image' })
			),
			{ image: 'upload_empty' }
		);
		assert.equal(storage.files.size, 0);
		assert.equal((await db.select().from(upload)).length, 0);
	});

	test('if the database fails, the stored files are removed again', async () => {
		const ghost = { id: 'nobody', platformRole: 'member' as const }; // violates the user FK
		await assert.rejects(storeUpload(db, storage, ghost, { data: await jpeg(200, 100) }));
		assert.equal(storage.files.size, 0);
	});

	test('if storage fails, nothing reaches the database', async () => {
		const broken: FileStorage = {
			...storage,
			put: async () => {
				throw new Error('disk full');
			}
		};
		await assert.rejects(storeUpload(db, broken, kim, { data: await jpeg(200, 100) }), /disk full/);
		assert.equal((await db.select().from(upload)).length, 0);
	});
});

describe('openUpload and access', () => {
	test('the uploader and superadmins may see an unreferenced upload, nobody else', async () => {
		const { id } = await storeUpload(db, storage, kim, { data: await jpeg(600, 400) });
		assert.equal(await canViewUpload(db, kim, id), true);
		assert.equal(await canViewUpload(db, sa, id), true);
		assert.equal(await canViewUpload(db, lu, id), false);

		const file = await openUpload(db, storage, kim, id, 'thumb');
		assert.equal(file.mime, 'image/webp');
		const bytes = await read(file.body);
		assert.equal(bytes.length, file.size);
		assert.deepEqual(
			await sharp(bytes)
				.metadata()
				.then((m) => [m.format, m.width]),
			['webp', 480]
		);
		assert.equal(file.etag, `"${id}-thumb"`);
	});

	test('not allowed, unknown variant, unknown id, malformed id: all the same answer', async () => {
		const { id } = await storeUpload(db, storage, kim, { data: await jpeg(600, 400) });
		await notFound(openUpload(db, storage, lu, id, 'large'));
		await notFound(openUpload(db, storage, kim, id, 'original'));
		await notFound(openUpload(db, storage, kim, crypto.randomUUID(), 'large'));
		await notFound(openUpload(db, storage, kim, '../../etc/passwd', 'large'));
		await notFound(openUpload(db, storage, kim, id, '../large'));
	});

	test('byte ranges pass through', async () => {
		const { id } = await storeUpload(db, storage, kim, { data: await jpeg(600, 400) });
		const whole = await read((await openUpload(db, storage, kim, id, 'large')).body);
		const part = await openUpload(db, storage, kim, id, 'large', { range: { start: 0, end: 11 } });
		assert.deepEqual(await read(part.body), whole.subarray(0, 12));
		assert.equal(part.size, whole.length);
		// a WebP starts with RIFF....WEBP
		assert.equal(new TextDecoder().decode(whole.subarray(8, 12)), 'WEBP');
	});
});

describe('getUploadView and deleteUpload', () => {
	test('view for rendering; delete removes rows and files', async () => {
		const { id } = await storeUpload(db, storage, kim, { data: await jpeg(1000, 1000) });
		assert.deepEqual((await getUploadView(db, id))?.variants.thumb, { width: 480, height: 480 });
		assert.equal(await getUploadView(db, 'not-a-uuid'), null);

		await deleteUpload(db, storage, id);
		assert.equal(await getUploadView(db, id), null);
		assert.equal(storage.files.size, 0);
		assert.equal((await db.select().from(uploadFile)).length, 0);
	});
});
