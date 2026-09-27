import { command, query } from '$app/server';
import * as v from 'valibot';
import { api, sdk } from '$api/client';
import { ApiError } from '$api/errors';
import type { UserResource } from '$lib/api/generated/types.gen';

export const getMe = query(async (): Promise<UserResource> => api(sdk.meShow));

export type SaveResult =
	{ ok: true } | { ok: false; message: string; fields: Record<string, string> };

const profileSchema = v.object({
	displayName: v.pipe(v.string(), v.minLength(1, 'Bitte gib einen Namen ein.')),
	pronoun: v.optional(v.string()),
	phone: v.optional(v.string()),
	accessibilityNote: v.optional(v.string()),
	interests: v.optional(v.array(v.string())),
	visibility: v.picklist(['members', 'admins']),
	photoVisibility: v.picklist(['members', 'admins', 'nobody']),
	notifyByEmail: v.optional(v.boolean()),
	notifyNewTasks: v.optional(v.boolean())
});

export const updateProfile = command(profileSchema, async (body): Promise<SaveResult> => {
	try {
		await api(sdk.meUpdate, { body });
		// The layout and any open profile view read from getMe, so
		// refreshing here is what makes the change appear everywhere
		// without a full navigation.
		await getMe().refresh();
		return { ok: true };
	} catch (error) {
		if (error instanceof ApiError) {
			return { ok: false, message: error.message, fields: error.fields };
		}
		throw error;
	}
});
