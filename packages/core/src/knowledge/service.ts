/*
 * The built-in wiki. Everyone reads; admins create, edit, move, delete
 * and restore (ROADMAP 6b). Every save is a new revision; nothing is ever
 * overwritten. Pages nest at most WIKI_MAX_DEPTH levels deep.
 */
import { and, asc, desc, eq, inArray, isNotNull, isNull, like, max, or, sql } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { profile, wikiPage, wikiRevision, type WikiPage } from '@commonsdb/db/schema';
import { parseRichText, toHtml, toMarkdown, toText, type RichTextDoc } from '@commonsdb/richtext';
import { DomainError, ValidationError } from '../errors.ts';
import { isAdmin, type Actor } from '../roles.ts';
import { parse } from '../validation.ts';
import type { KnowledgeEntry, KnowledgeHit, KnowledgeProvider } from './provider.ts';
import { slugify } from './slug.ts';
import { CreatePageInput, MovePageInput, UpdatePageInput, WIKI_MAX_DEPTH } from './schema.ts';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Executor = Db | Tx;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---- views ------------------------------------------------------------------

export type WikiTreeItem = {
	id: string;
	slug: string;
	title: string;
	parentId: string | null;
	position: number;
};

export type WikiPageView = {
	id: string;
	slug: string;
	title: string;
	content: RichTextDoc | null;
	/** The revision this view shows; editors send it back as baseRevisionId. */
	revisionId: string;
	updatedAt: Date;
	updatedBy: string | null;
	/** Ancestors, top first. */
	breadcrumbs: { slug: string; title: string }[];
	children: { slug: string; title: string }[];
	/** How deep this page sits (1 = top level); new children need depth < max. */
	depth: number;
	canEdit: boolean;
};

export type WikiRevisionItem = {
	id: string;
	title: string;
	author: string | null;
	createdAt: Date;
	current: boolean;
};

export type WikiRevisionView = WikiRevisionItem & { content: RichTextDoc | null };

export type WikiSearchHit = { id: string; slug: string; title: string; snippet: string | null };

// ---- internals --------------------------------------------------------------

const canEdit = (actor: Actor) => isAdmin(actor);

function assertEditor(actor: Actor) {
	if (!canEdit(actor)) throw new DomainError('forbidden');
}

async function pageBySlug(db: Executor, slug: string): Promise<WikiPage> {
	const [p] = await db
		.select()
		.from(wikiPage)
		.where(and(eq(wikiPage.slug, slug), isNull(wikiPage.deletedAt)));
	if (!p) throw new DomainError('wiki_page_not_found');
	return p;
}

/** Ancestors of a page (or of a would-be parent), nearest first. */
async function ancestors(db: Executor, parentId: string | null) {
	const chain: WikiPage[] = [];
	let next = parentId;
	// the depth limit keeps this short; the guard stops a corrupt cycle
	while (next && chain.length <= WIKI_MAX_DEPTH + 1) {
		const [p] = await db.select().from(wikiPage).where(eq(wikiPage.id, next));
		if (!p) break;
		chain.push(p);
		next = p.parentId;
	}
	return chain;
}

/** Levels below a page: 0 = no children, 1 = children, 2 = grandchildren. */
async function levelsBelow(db: Executor, id: string): Promise<number> {
	let level = 0;
	let ids = [id];
	while (ids.length && level <= WIKI_MAX_DEPTH) {
		const rows = await db
			.select({ id: wikiPage.id })
			.from(wikiPage)
			.where(and(inArray(wikiPage.parentId, ids), isNull(wikiPage.deletedAt)));
		if (!rows.length) break;
		level++;
		ids = rows.map((r) => r.id);
	}
	return level;
}

/** A parent that exists, isn't deleted, and leaves room for `levels` more. */
async function checkParent(db: Executor, parentId: string | null, levels: number) {
	if (!parentId) return;
	const chain = await ancestors(db, parentId);
	if (!chain.length || chain[0].deletedAt) {
		throw new ValidationError({ parentId: 'wiki_parent_not_found' });
	}
	if (chain.length + levels > WIKI_MAX_DEPTH) {
		throw new ValidationError({ parentId: 'wiki_too_deep' });
	}
}

/** `base`, or `base-2`, `base-3` … whichever is free (deleted pages keep theirs). */
async function uniqueSlug(db: Executor, base: string) {
	const taken = new Set(
		(
			await db
				.select({ slug: wikiPage.slug })
				.from(wikiPage)
				.where(or(eq(wikiPage.slug, base), like(wikiPage.slug, `${base}-%`)))
		).map((r) => r.slug)
	);
	if (!taken.has(base)) return base;
	let n = 2;
	while (taken.has(`${base}-${n}`)) n++;
	return `${base}-${n}`;
}

async function nextPosition(db: Executor, parentId: string | null) {
	const [row] = await db
		.select({ max: max(wikiPage.position) })
		.from(wikiPage)
		.where(parentId ? eq(wikiPage.parentId, parentId) : isNull(wikiPage.parentId));
	return (row?.max ?? -1) + 1;
}

/** New revision + page pointing at it. `expect` = current revision (conflict check). */
async function writeRevision(
	tx: Tx,
	actor: Actor,
	pageId: string,
	data: { title: string; content: RichTextDoc | null },
	expect: string | null
) {
	const [rev] = await tx
		.insert(wikiRevision)
		.values({ pageId, title: data.title, content: data.content, authorId: actor.id })
		.returning({ id: wikiRevision.id });
	const [updated] = await tx
		.update(wikiPage)
		.set({
			title: data.title,
			searchText: data.content ? toText('wiki', data.content) : '',
			currentRevisionId: rev.id,
			updatedAt: new Date()
		})
		.where(
			and(
				eq(wikiPage.id, pageId),
				expect ? eq(wikiPage.currentRevisionId, expect) : isNull(wikiPage.currentRevisionId)
			)
		)
		.returning({ id: wikiPage.id });
	// someone saved in between: roll back, the editor has to look again
	if (!updated) throw new DomainError('wiki_page_conflict');
	return rev.id;
}

// ---- reading ----------------------------------------------------------------

/** All pages (not deleted), for the tree; the UI nests them by parentId. */
export async function listWikiTree(db: Db): Promise<WikiTreeItem[]> {
	return db
		.select({
			id: wikiPage.id,
			slug: wikiPage.slug,
			title: wikiPage.title,
			parentId: wikiPage.parentId,
			position: wikiPage.position
		})
		.from(wikiPage)
		.where(isNull(wikiPage.deletedAt))
		.orderBy(asc(wikiPage.position), asc(wikiPage.title));
}

/** A page as everyone reads it; `canEdit` depends on who asks. */
export async function getWikiPage(db: Db, actor: Actor, slug: string): Promise<WikiPageView> {
	return { ...(await readPage(db, slug)), canEdit: canEdit(actor) };
}

async function readPage(db: Executor, slug: string): Promise<Omit<WikiPageView, 'canEdit'>> {
	const p = await pageBySlug(db, slug);
	const [rev] = await db
		.select({
			id: wikiRevision.id,
			content: wikiRevision.content,
			createdAt: wikiRevision.createdAt,
			author: profile.displayName
		})
		.from(wikiRevision)
		.leftJoin(profile, eq(profile.userId, wikiRevision.authorId))
		.where(eq(wikiRevision.id, p.currentRevisionId ?? ''));
	if (!rev) throw new DomainError('wiki_page_not_found');

	const chain = await ancestors(db, p.parentId);
	const children = await db
		.select({ slug: wikiPage.slug, title: wikiPage.title })
		.from(wikiPage)
		.where(and(eq(wikiPage.parentId, p.id), isNull(wikiPage.deletedAt)))
		.orderBy(asc(wikiPage.position), asc(wikiPage.title));

	return {
		id: p.id,
		slug: p.slug,
		title: p.title,
		content: rev.content,
		revisionId: rev.id,
		updatedAt: rev.createdAt,
		updatedBy: rev.author,
		breadcrumbs: chain.reverse().map((a) => ({ slug: a.slug, title: a.title })),
		children,
		depth: chain.length + 1
	};
}

export async function listWikiRevisions(db: Db, slug: string): Promise<WikiRevisionItem[]> {
	const p = await pageBySlug(db, slug);
	const rows = await db
		.select({
			id: wikiRevision.id,
			title: wikiRevision.title,
			author: profile.displayName,
			createdAt: wikiRevision.createdAt
		})
		.from(wikiRevision)
		.leftJoin(profile, eq(profile.userId, wikiRevision.authorId))
		.where(eq(wikiRevision.pageId, p.id))
		.orderBy(desc(wikiRevision.createdAt), desc(wikiRevision.id));
	return rows.map((r) => ({ ...r, current: r.id === p.currentRevisionId }));
}

export async function getWikiRevision(
	db: Db,
	slug: string,
	revisionId: string
): Promise<WikiRevisionView> {
	const p = await pageBySlug(db, slug);
	if (!UUID.test(revisionId)) throw new DomainError('wiki_revision_not_found');
	const [r] = await db
		.select({
			id: wikiRevision.id,
			title: wikiRevision.title,
			content: wikiRevision.content,
			author: profile.displayName,
			createdAt: wikiRevision.createdAt
		})
		.from(wikiRevision)
		.leftJoin(profile, eq(profile.userId, wikiRevision.authorId))
		.where(and(eq(wikiRevision.id, revisionId), eq(wikiRevision.pageId, p.id)));
	if (!r) throw new DomainError('wiki_revision_not_found');
	return { ...r, current: r.id === p.currentRevisionId };
}

/**
 * Full-text search with German stemming ("Schlüssel" finds "Schlüsseln")
 * and prefixes (… and "Schlüsselbund"), title weighted over text.
 * Also takes web-search syntax: "exakte Phrase", -ausschließen, or.
 */
export async function searchWiki(db: Db, q: string, limit = 20): Promise<WikiSearchHit[]> {
	const term = q.trim();
	const words = term.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
	if (!words.length) return [];
	// web-search syntax, or every word as a prefix: German compounds
	// ("Schlüsselbund") only match "schlüssel" as a prefix
	const prefixes = words.map((w) => `${w}:*`).join(' & ');
	const query = sql`(websearch_to_tsquery('german', ${term}) || to_tsquery('german', ${prefixes}))`;
	return db
		.select({
			id: wikiPage.id,
			slug: wikiPage.slug,
			title: wikiPage.title,
			snippet: sql<string | null>`nullif(ts_headline('german', ${wikiPage.searchText}, ${query},
				'StartSel=«, StopSel=», MaxWords=24, MinWords=8, MaxFragments=1'), '')`
		})
		.from(wikiPage)
		.where(and(isNull(wikiPage.deletedAt), sql`${wikiPage.search} @@ ${query}`))
		.orderBy(desc(sql`ts_rank(${wikiPage.search}, ${query})`), asc(wikiPage.title))
		.limit(limit);
}

/** The page as Markdown, for download (and a later move to Outline). */
export async function exportWikiMarkdown(db: Db, slug: string) {
	const p = await readPage(db, slug);
	return { filename: `${p.slug}.md`, markdown: toMarkdown(p.content, p.title) };
}

// ---- writing (admins) ---------------------------------------------------------

export async function createWikiPage(db: Db, actor: Actor, input: unknown) {
	assertEditor(actor);
	const data = parse(CreatePageInput, input);
	await checkParent(db, data.parentId, 1);

	return db.transaction(async (tx) => {
		const slug = await uniqueSlug(tx, slugify(data.title));
		const [p] = await tx
			.insert(wikiPage)
			.values({
				slug,
				title: data.title,
				parentId: data.parentId,
				position: await nextPosition(tx, data.parentId),
				createdBy: actor.id
			})
			.returning({ id: wikiPage.id });
		await writeRevision(tx, actor, p.id, data, null);
		return { id: p.id, slug };
	});
}

/**
 * Save a new revision. The slug stays (links keep working). Fails with
 * 'wiki_page_conflict' if someone saved since `baseRevisionId`.
 * Saving unchanged content creates no revision.
 */
export async function updateWikiPage(db: Db, actor: Actor, slug: string, input: unknown) {
	assertEditor(actor);
	const data = parse(UpdatePageInput, input);
	const p = await pageBySlug(db, slug);
	if (p.currentRevisionId !== data.baseRevisionId) throw new DomainError('wiki_page_conflict');

	const [current] = await db
		.select({ content: wikiRevision.content })
		.from(wikiRevision)
		.where(eq(wikiRevision.id, data.baseRevisionId));
	// jsonb reorders keys, so compare both after the same normalisation
	const stored = parseRichText('wiki', current?.content ?? null);
	const unchanged =
		p.title === data.title &&
		stored.ok &&
		JSON.stringify(stored.doc) === JSON.stringify(data.content);
	if (unchanged) return { slug, revisionId: data.baseRevisionId };

	const revisionId = await db.transaction((tx) =>
		writeRevision(tx, actor, p.id, data, data.baseRevisionId)
	);
	return { slug, revisionId };
}

/** Bring back an old version: a new revision with its title and content. */
export async function restoreWikiRevision(db: Db, actor: Actor, slug: string, revisionId: string) {
	assertEditor(actor);
	const old = await getWikiRevision(db, slug, revisionId);
	const p = await pageBySlug(db, slug);
	return db.transaction((tx) =>
		writeRevision(tx, actor, p.id, { title: old.title, content: old.content }, p.currentRevisionId)
	);
}

/** New parent (or top level) and position. Not into itself, not too deep. */
export async function moveWikiPage(db: Db, actor: Actor, slug: string, input: unknown) {
	assertEditor(actor);
	const data = parse(MovePageInput, input);
	const p = await pageBySlug(db, slug);
	if (data.parentId) {
		const chain = await ancestors(db, data.parentId);
		if (data.parentId === p.id || chain.some((a) => a.id === p.id)) {
			throw new ValidationError({ parentId: 'wiki_move_into_itself' });
		}
	}
	await checkParent(db, data.parentId, 1 + (await levelsBelow(db, p.id)));
	await db
		.update(wikiPage)
		.set({ parentId: data.parentId, position: data.position, updatedAt: new Date() })
		.where(eq(wikiPage.id, p.id));
}

/** Soft delete; pages with (undeleted) subpages can't go. Links to it stay. */
export async function deleteWikiPage(db: Db, actor: Actor, slug: string) {
	assertEditor(actor);
	const p = await pageBySlug(db, slug);
	if ((await levelsBelow(db, p.id)) > 0) throw new DomainError('wiki_has_children');
	await db
		.update(wikiPage)
		.set({ deletedAt: new Date(), deletedBy: actor.id })
		.where(eq(wikiPage.id, p.id));
}

export async function listDeletedWikiPages(db: Db, actor: Actor) {
	assertEditor(actor);
	return db
		.select({
			id: wikiPage.id,
			slug: wikiPage.slug,
			title: wikiPage.title,
			deletedAt: wikiPage.deletedAt
		})
		.from(wikiPage)
		.where(isNotNull(wikiPage.deletedAt))
		.orderBy(desc(wikiPage.deletedAt));
}

/** Back from the bin. If its parent is gone (or full), it comes back on top level. */
export async function restoreWikiPage(db: Db, actor: Actor, id: string) {
	assertEditor(actor);
	if (!UUID.test(id)) throw new DomainError('wiki_page_not_found');
	const [p] = await db
		.select()
		.from(wikiPage)
		.where(and(eq(wikiPage.id, id), isNotNull(wikiPage.deletedAt)));
	if (!p) throw new DomainError('wiki_page_not_found');
	let parentId = p.parentId;
	try {
		await checkParent(db, parentId, 1);
	} catch {
		parentId = null;
	}
	await db
		.update(wikiPage)
		.set({ deletedAt: null, deletedBy: null, parentId, updatedAt: new Date() })
		.where(eq(wikiPage.id, p.id));
	return { slug: p.slug };
}

// ---- the provider ---------------------------------------------------------------

/**
 * The built-in wiki behind the KnowledgeProvider port. `ref` is the page
 * id (stable across renames). `pageUrl` comes from the app: core doesn't
 * know routes.
 */
export function builtinKnowledge(
	db: Db,
	{ pageUrl }: { pageUrl: (slug: string) => string }
): KnowledgeProvider {
	return {
		id: 'builtin',
		async search(q, limit = 10): Promise<KnowledgeHit[]> {
			return (await searchWiki(db, q, limit)).map((h) => ({
				provider: 'builtin',
				ref: h.id,
				title: h.title,
				snippet: h.snippet
			}));
		},
		async get(ref): Promise<KnowledgeEntry | null> {
			if (!UUID.test(ref)) return null;
			const [p] = await db
				.select({ slug: wikiPage.slug })
				.from(wikiPage)
				.where(and(eq(wikiPage.id, ref), isNull(wikiPage.deletedAt)));
			if (!p) return null;
			const page = await readPage(db, p.slug);
			return {
				provider: 'builtin',
				ref,
				title: page.title,
				html: toHtml('wiki', page.content),
				updatedAt: page.updatedAt,
				url: pageUrl(page.slug),
				editUrl: null
			};
		}
	};
}
