/*
 * Profile picture (slice 6c): upload/replace and remove. Replaced and
 * removed pictures are deleted right away (core/uploads/profile-photo.ts).
 * After either, SvelteKit reloads the page's data, so the avatar in the
 * shell updates too.
 */
import { form } from '$app/server';
import * as v from 'valibot';
import { removeProfilePhoto, setProfilePhoto } from '@commonsdb/core/uploads';
import { db, storage } from '#lib/server/services.ts';
import { requireActor, toFormIssues } from '#lib/server/guards.ts';

export const uploadPhoto = form(
	// a missing or empty file is core's `upload_empty`, as a field error
	v.object({ photo: v.optional(v.file()) }),
	async ({ photo }) => {
		const data = photo ? new Uint8Array(await photo.arrayBuffer()) : new Uint8Array();
		await setProfilePhoto(db, storage, requireActor(), {
			data,
			name: photo?.name ?? ''
		}).catch(toFormIssues);
		return { done: true };
	}
);

export const removePhoto = form(async () => {
	await removeProfilePhoto(db, storage, requireActor());
	return { done: true };
});
