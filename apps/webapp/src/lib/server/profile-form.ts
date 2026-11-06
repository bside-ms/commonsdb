import { fail } from '@sveltejs/kit';
import { ValidationError } from '@commonsdb/core';
import type { Profile } from '@commonsdb/db/schema';

export function profileFormValues(form: FormData) {
	return {
		displayName: String(form.get('displayName') ?? ''),
		pronoun: String(form.get('pronoun') ?? ''),
		phone: String(form.get('phone') ?? ''),
		accessibilityNote: String(form.get('accessibilityNote') ?? ''),
		visibility: String(form.get('visibility') ?? ''),
		photoVisibility: String(form.get('photoVisibility') ?? ''),
		notifyByEmail: form.has('notifyByEmail'),
		notifyNewTasks: form.has('notifyNewTasks')
	};
}
export type ProfileFormValues = ReturnType<typeof profileFormValues>;

/** Stored profile → form values, for the initial render. */
export function toFormValues(p: Profile): ProfileFormValues {
	return {
		displayName: p.displayName,
		pronoun: p.pronoun ?? '',
		phone: p.phone ?? '',
		accessibilityNote: p.accessibilityNote ?? '',
		visibility: p.visibility,
		photoVisibility: p.photoVisibility,
		notifyByEmail: p.notifyByEmail,
		notifyNewTasks: p.notifyNewTasks
	};
}

/** Validation errors → 400 with field codes, so the form re-renders with input intact. */
export function failValidation(e: unknown, values: ProfileFormValues) {
	if (e instanceof ValidationError) return fail(400, { values, fields: e.fields });
	throw e;
}
