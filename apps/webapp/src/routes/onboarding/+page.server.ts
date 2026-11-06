import { redirect } from '@sveltejs/kit';
import { completeOnboarding } from '@commonsdb/core';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/services.ts';
import { failValidation, profileFormValues, toFormValues } from '#lib/server/profile-form.ts';

export const load: PageServerLoad = ({ locals }) => ({
	values: toFormValues(locals.profile!)
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const values = profileFormValues(form);
		try {
			await completeOnboarding(db, locals.actor!, {
				...values,
				acceptRules: form.has('acceptRules')
			});
		} catch (e) {
			return failValidation(e, values);
		}
		redirect(303, '/');
	}
};
