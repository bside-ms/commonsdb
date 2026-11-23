/*
 * Profile pictures (slice 6c). One per person; replacing or removing one
 * deletes the old file right away (nothing of it stays on the server).
 * Who sees it: profile/photo.ts and canViewUpload.
 */
import { eq } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { profile } from '@commonsdb/db/schema';
import type { FileStorage } from '@commonsdb/media';
import type { Actor } from '../roles.ts';
import { deleteUpload, storeUpload, type UploadInput, type UploadView } from './service.ts';

/** Store a new picture and make it the actor's. Field errors come as `photo`. */
export async function setProfilePhoto(
	db: Db,
	storage: FileStorage,
	actor: Actor,
	input: UploadInput
): Promise<UploadView> {
	const stored = await storeUpload(db, storage, actor, input, { allow: ['image'], field: 'photo' });
	const old = await swapPhoto(db, actor, stored.id);
	if (old) await deleteUpload(db, storage, old);
	return stored;
}

export async function removeProfilePhoto(db: Db, storage: FileStorage, actor: Actor) {
	const old = await swapPhoto(db, actor, null);
	if (old) await deleteUpload(db, storage, old);
}

/** Set the photo, return the one it replaces. Row lock: two quick uploads can't both keep theirs. */
async function swapPhoto(db: Db, actor: Actor, photoId: string | null) {
	return db.transaction(async (tx) => {
		const [current] = await tx
			.select({ photoId: profile.photoId })
			.from(profile)
			.where(eq(profile.userId, actor.id))
			.for('update');
		await tx.update(profile).set({ photoId }).where(eq(profile.userId, actor.id));
		return current?.photoId ?? null;
	});
}
