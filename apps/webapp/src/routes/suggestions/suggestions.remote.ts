/*
 * Members' suggestions (slice 7): submit one, see what became of yours.
 * The photo is stored first (withImage) so core only sees an upload id.
 */
import { form, query } from '$app/server';
import {
	createSuggestion,
	listCategories,
	listOwnSuggestions,
	SuggestionInput
} from '@commonsdb/core';
import { db } from '#lib/server/services.ts';
import { requireActor, toFormIssues } from '#lib/server/guards.ts';
import { withImage } from '#lib/server/template-image.ts';

export const mySuggestions = query(async () => listOwnSuggestions(db, requireActor()));

export const suggestionCategories = query(async () => {
	requireActor();
	return listCategories(db);
});

export type SuggestionFormData = {
	title: string;
	body?: string;
	place?: string;
	categoryId?: string;
	image?: File;
};

export const submitSuggestion = form('unchecked', async (posted: SuggestionFormData) => {
	const actor = requireActor();
	try {
		await createSuggestion(db, actor, await withImage(actor, posted, SuggestionInput));
	} catch (e) {
		toFormIssues(e);
	}
	await mySuggestions().refresh();
	return { done: true };
});
