/*
 * Admin side of suggestions (slice 7). Every function starts with
 * requireAdmin(): remote functions have their own URLs, so the /admin
 * guard in hooks.server.ts doesn't cover them. Category scope is core's.
 *
 * Converting goes through saveTask (admin/tasks) with a suggestionId, so
 * the task form, its validation and the photo handling stay in one place.
 */
import { redirect } from '@sveltejs/kit';
import { form, query } from '$app/server';
import * as v from 'valibot';
import { fromPlainText, toHtml } from '@commonsdb/richtext';
import {
	countOpenSuggestions,
	getSuggestionForAdmin,
	listManageableCategories,
	listSuggestionsForAdmin,
	rejectSuggestion,
	SUGGESTION_STATUSES
} from '@commonsdb/core';
import { db } from '#lib/server/services.ts';
import { requireAdmin, toFormIssues, toHttpError } from '#lib/server/guards.ts';

const Id = v.pipe(v.string(), v.uuid());

/** Open suggestions in this admin's scope, for the nav badge. */
export const openSuggestionCount = query(async () => countOpenSuggestions(db, requireAdmin()));

export const adminSuggestions = query(
	v.object({ status: v.optional(v.picklist(SUGGESTION_STATUSES)) }),
	async (filter) => listSuggestionsForAdmin(db, requireAdmin(), filter).catch(toHttpError)
);

/** One suggestion, plus what the task form starts from when converting it. */
export const adminSuggestion = query(Id, async (id) => {
	const actor = requireAdmin();
	const [s, categories] = await Promise.all([
		getSuggestionForAdmin(db, actor, id).catch(toHttpError),
		listManageableCategories(db, actor)
	]);
	// the member's guess only if this admin may use it; otherwise they pick
	const usable = categories.some((g) => g.categories.some((c) => c.id === s.categoryId));
	const description = s.body ? fromPlainText(s.body) : null;
	return {
		suggestion: s,
		categories,
		prefill: {
			title: s.title,
			categoryId: usable ? (s.categoryId ?? '') : '',
			description,
			urgent: false,
			selfService: false,
			place: s.place,
			contact: null,
			bring: null,
			physicalDemands: null,
			imageId: s.imageId,
			imageAlt: null
		},
		descriptionHtml: toHtml('description', description)
	};
});

export const reject = form(
	v.object({ id: Id, note: v.optional(v.string()) }),
	async ({ id, note }) => {
		await rejectSuggestion(db, requireAdmin(), id, { note }).catch(toFormIssues);
		redirect(303, '/admin/suggestions');
	}
);
