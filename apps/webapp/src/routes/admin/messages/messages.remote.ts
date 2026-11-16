/*
 * The shared admin inbox. requireAdmin() on every function: remote
 * functions have their own URLs, the /admin guard doesn't cover them.
 * Reading and replying go through the member remote (thread, sendReply):
 * core knows the reader is an admin.
 */
import { form, query } from '$app/server';
import * as v from 'valibot';
import {
	ADMIN_INBOX_TABS,
	adminInboxCounts,
	archiveThreads,
	claimThread,
	countAdminUnread,
	defaultAdminInboxCategories,
	deleteThreadsForAdmins,
	listAdminInbox
} from '@commonsdb/core';
import { db } from '#lib/server/services.ts';
import { requireAdmin, toFormIssues, toHttpError } from '#lib/server/guards.ts';

const Id = v.pipe(v.string(), v.uuid());

const Filter = v.object({
	tab: v.picklist(ADMIN_INBOX_TABS),
	/** 'mine' = the admin's categories (default), 'all' = everything */
	scope: v.picklist(['mine', 'all']),
	q: v.optional(v.string(), ''),
	sort: v.picklist(['recent', 'waiting'])
});

async function categoriesFor(scope: 'mine' | 'all') {
	const actor = requireAdmin();
	return scope === 'all' ? ('all' as const) : await defaultAdminInboxCategories(db, actor);
}

/** The list for one tab, plus the counts of all tabs for the labels. */
export const adminInbox = query(Filter, async ({ tab, scope, q, sort }) => {
	const actor = requireAdmin();
	const categories = await categoriesFor(scope);
	const [threads, counts] = await Promise.all([
		listAdminInbox(db, actor, { tab, categories, q, sort }),
		adminInboxCounts(db, actor, { categories, q })
	]);
	return { threads, counts };
});

/** Does "my categories" differ from "all" for this admin? Hides the toggle if not. */
export const hasOwnScope = query(async () => {
	const actor = requireAdmin();
	return (await defaultAdminInboxCategories(db, actor)) !== 'all';
});

/** The admin nav badge. */
export const adminUnread = query(async () =>
	countAdminUnread(db, requireAdmin()).catch(toHttpError)
);

export const claim = form(
	v.object({ threadId: Id, claim: v.picklist(['take', 'release']) }),
	async ({ threadId, claim: c }) => {
		await claimThread(db, requireAdmin(), threadId, c === 'take').catch(toFormIssues);
		return { done: true };
	}
);

/**
 * Archive, bring back or delete one or many (checkboxes on the list, or
 * a single hidden id on the thread page). The pressed button says which.
 */
export const bulk = form(
	v.object({
		ids: v.optional(v.array(Id), []),
		action: v.picklist(['archive', 'unarchive', 'delete'])
	}),
	async ({ ids, action }) => {
		const actor = requireAdmin();
		if (action === 'delete') await deleteThreadsForAdmins(db, actor, ids);
		else await archiveThreads(db, actor, ids, action === 'archive');
		return { done: true, action, count: ids.length };
	}
);
