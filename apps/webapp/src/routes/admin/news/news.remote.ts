/*
 * Writing news (slice 7). Every function starts with requireAdmin():
 * remote functions have their own URLs, so the /admin guard in
 * hooks.server.ts doesn't cover them. Validation is core's (NewsInput).
 */
import { error, redirect } from '@sveltejs/kit';
import { form, query } from '$app/server';
import * as v from 'valibot';
import {
	createNews,
	deleteNews,
	getNewsForAdmin,
	listNewsForAdmin,
	updateNews
} from '@commonsdb/core';
import { toHtml } from '@commonsdb/richtext';
import { db } from '#lib/server/services.ts';
import { requireAdmin, toFormIssues, toHttpError } from '#lib/server/guards.ts';

const Id = v.pipe(v.string(), v.uuid());

export const adminNews = query(async () => listNewsForAdmin(db, requireAdmin()).catch(toHttpError));

/** One post for the edit page, with its body pre-rendered for the editor's first paint. */
export const adminNewsItem = query(Id, async (id) => {
	const item = await getNewsForAdmin(db, requireAdmin(), id).catch(toHttpError);
	return { ...item, html: toHtml('news', item.body) };
});

/** What the news form posts. 'unchecked': core's NewsInput validates. */
export type NewsFormData = {
	id?: string;
	title: string;
	body?: string;
	pinned?: boolean;
	published?: boolean;
	visibleUntil?: string;
};

/** Create (no id) or update (with id). Back to the list on success. */
export const saveNews = form('unchecked', async ({ id, ...input }: NewsFormData) => {
	const actor = requireAdmin();
	if (id !== undefined && !v.is(Id, id)) error(400, 'news_not_found');
	try {
		if (id) await updateNews(db, actor, id, input);
		else await createNews(db, actor, input);
	} catch (e) {
		toFormIssues(e);
	}
	redirect(303, '/admin/news');
});

export const removeNews = form(v.object({ id: Id }), async ({ id }) => {
	await deleteNews(db, requireAdmin(), id).catch(toFormIssues);
	redirect(303, '/admin/news');
});
