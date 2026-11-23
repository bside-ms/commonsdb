/*
 * The photo field of the task and series forms (slice 6c). Core's task
 * services only take an upload id (they stay free of sharp, see
 * ARCHITECTURE "Barrels stay browser-safe"); this stores a picked file
 * first and swaps it for the id.
 */
import * as v from 'valibot';
import type { Actor } from '@commonsdb/core';
import { storeUpload } from '@commonsdb/core/uploads';
import { db, storage } from './services.ts';

type ImageFields = {
	image?: File;
	removeImage?: boolean | string;
	imageId?: string;
};

/**
 * The form's input with `imageId` set to what the task should show: a
 * newly picked photo, nothing (remove ticked), or the current one.
 * The photo is only stored when the rest of the form is valid, so a
 * form that comes back with errors leaves no unused file behind; the
 * service call then reports those errors as usual.
 */
export async function withImage<T extends ImageFields>(
	actor: Actor,
	{ image, removeImage, ...input }: T,
	schema: v.GenericSchema
): Promise<Omit<T, 'image' | 'removeImage'>> {
	if (image instanceof File && image.size > 0) {
		if (!v.is(schema, { ...input, imageId: '' })) return input;
		const stored = await storeUpload(
			db,
			storage,
			actor,
			{ data: new Uint8Array(await image.arrayBuffer()), name: image.name },
			{ allow: ['image'], field: 'image' }
		);
		return { ...input, imageId: stored.id };
	}
	return removeImage ? { ...input, imageId: '' } : input;
}
