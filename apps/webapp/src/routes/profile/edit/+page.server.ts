import { redirect } from '@sveltejs/kit';
import { updateOwnProfile } from '@commonsdb/core';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/services.ts';
import { failValidation, profileFormValues, toFormValues } from '#lib/server/profile-form.ts';

export const load: PageServerLoad = ({ locals }) => ({
	values: toFormValues(locals.profile!)
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const values = profileFormValues(await request.formData());
		try {
			await updateOwnProfile(db, locals.actor!, values);
		} catch (e) {
			return failValidation(e, values);
		}
		redirect(303, '/profile');
	}
};
