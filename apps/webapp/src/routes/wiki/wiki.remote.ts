/*
 * The built-in wiki. Everyone signed in reads; writing is for admins,
 * which core checks (requireActor here, 'forbidden' from core otherwise).
 * Pages are addressed by slug; content arrives as TipTap JSON and leaves
 * as server-rendered HTML.
 */
import { redirect } from '@sveltejs/kit';
import { form, query } from '$app/server';
import * as v from 'valibot';
import {
	createWikiPage,
	deleteWikiPage,
	getWikiPage,
	getWikiRevision,
	listDeletedWikiPages,
	listWikiRevisions,
	listWikiTree,
	moveWikiPage,
	restoreWikiPage,
	restoreWikiRevision,
	searchWiki,
	updateWikiPage
} from '@commonsdb/core';
import { toHtml } from '@commonsdb/richtext';
import { db } from '#lib/server/services.ts';
import { requireActor, requireAdmin, toFormIssues, toHttpError } from '#lib/server/guards.ts';

const Slug = v.pipe(v.string(), v.nonEmpty(), v.maxLength(100));
const Id = v.pipe(v.string(), v.uuid());
const pagePath = (slug: string) => `/wiki/${slug}`;

// ---- reads ------------------------------------------------------------------

export const tree = query(async () => {
	requireActor();
	return listWikiTree(db);
});

export const wikiPage = query(Slug, async (slug) => {
	const page = await getWikiPage(db, requireActor(), slug).catch(toHttpError);
	return { ...page, html: toHtml('wiki', page.content) };
});

export const search = query(v.string(), async (q) => {
	requireActor();
	return searchWiki(db, q);
});

export const revisions = query(Slug, async (slug) => {
	requireActor();
	return listWikiRevisions(db, slug).catch(toHttpError);
});

export const revision = query(v.object({ slug: Slug, id: Id }), async ({ slug, id }) => {
	requireActor();
	const r = await getWikiRevision(db, slug, id).catch(toHttpError);
	return { ...r, html: toHtml('wiki', r.content) };
});

export const trash = query(async () => listDeletedWikiPages(db, requireAdmin()).catch(toHttpError));

// ---- writing (admins; core checks) ------------------------------------------

export const create = form(
	v.object({
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		parentId: v.optional(v.string())
	}),
	async (input) => {
		const { slug } = await createWikiPage(db, requireActor(), input).catch(toFormIssues);
		redirect(303, pagePath(slug));
	}
);

export const save = form(
	v.object({
		slug: Slug,
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		baseRevisionId: v.optional(v.string())
	}),
	async ({ slug, ...input }) => {
		await updateWikiPage(db, requireActor(), slug, input).catch(toFormIssues);
		redirect(303, pagePath(slug));
	}
);

export const move = form(
	v.object({ slug: Slug, parentId: v.optional(v.string()) }),
	async ({ slug, parentId }) => {
		await moveWikiPage(db, requireActor(), slug, { parentId }).catch(toFormIssues);
		redirect(303, pagePath(slug));
	}
);

export const restoreRevision = form(
	v.object({ slug: Slug, revisionId: Id }),
	async ({ slug, revisionId }) => {
		await restoreWikiRevision(db, requireActor(), slug, revisionId).catch(toFormIssues);
		redirect(303, pagePath(slug));
	}
);

export const remove = form(v.object({ slug: Slug }), async ({ slug }) => {
	await deleteWikiPage(db, requireActor(), slug).catch(toFormIssues);
	redirect(303, '/wiki');
});

export const restorePage = form(v.object({ id: Id }), async ({ id }) => {
	const { slug } = await restoreWikiPage(db, requireActor(), id).catch(toFormIssues);
	redirect(303, pagePath(slug));
});
