/*
 * Which admin manages which categories. Superadmin only.
 */
import { form, query } from '$app/server';
import { listAdminCapabilities, listCategories, setCapabilities } from '@commonsdb/core';
import { db } from '#lib/server/services.ts';
import { requireSuperadmin, toFormIssues } from '#lib/server/guards.ts';

export const adminsWithCapabilities = query(async () =>
	listAdminCapabilities(db, requireSuperadmin())
);

export const allCategories = query(async () => {
	requireSuperadmin();
	return listCategories(db);
});

/** The form posts the full set of checked categories for one admin. */
export const saveCapabilities = form(
	'unchecked',
	async ({ userId, categoryIds }: { userId: string; categoryIds?: string[] }) => {
		await setCapabilities(db, requireSuperadmin(), userId, categoryIds ?? []).catch(toFormIssues);
		return { saved: true };
	}
);
