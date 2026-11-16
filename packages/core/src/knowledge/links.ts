/*
 * Links from tasks and series to knowledge entries (ROADMAP 6b, step 3).
 * Forms post them as keys `provider:ref`; for now only the built-in wiki
 * ('builtin:<page id>'). An Outline adapter would add its own resolver.
 *
 * Links belong to their entity: set in the same transaction as the task
 * or series, copied from a series to each new occurrence, removed when
 * a task is deleted for good (soft-deleted tasks keep them for restore).
 */
import * as v from 'valibot';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { knowledgeLink, wikiPage, type KnowledgeEntityType } from '@commonsdb/db/schema';
import { ValidationError } from '../errors.ts';

/** A db or a transaction. */
type Executor = Pick<Db, 'select' | 'insert' | 'update' | 'delete'>;

export const MAX_KNOWLEDGE_LINKS = 10;
const KEY = /^builtin:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREVIEW_LENGTH = 160;

/** The links field of the task and series forms: keys, deduplicated, in order. */
export const LinksInput = v.pipe(
	v.optional(v.array(v.string('knowledge_link_invalid'), 'knowledge_link_invalid'), []),
	v.transform((keys) => [...new Set(keys.map((k) => k.trim().toLowerCase()).filter(Boolean))]),
	v.check((keys) => keys.every((k) => KEY.test(k)), 'knowledge_link_invalid'),
	v.maxLength(MAX_KNOWLEDGE_LINKS, 'knowledge_links_too_many')
);

const keyOf = (l: { provider: string; ref: string }) => `${l.provider}:${l.ref}`;
const refOf = (key: string) => key.slice(key.indexOf(':') + 1);

/** A link as the admin form shows it. */
export type LinkView = { key: string; title: string; available: boolean };

/** A link as members see it on a task. `slug` only for live built-in pages. */
export type TaskLink = LinkView & { slug: string | null; preview: string | null };

type Entity = { type: KnowledgeEntityType; id: string };

async function load(db: Executor, type: KnowledgeEntityType, ids: string[]) {
	if (ids.length === 0) return [];
	return db
		.select({
			entityId: knowledgeLink.entityId,
			provider: knowledgeLink.provider,
			ref: knowledgeLink.ref,
			cachedTitle: knowledgeLink.cachedTitle,
			// live built-in page, if there is one
			slug: wikiPage.slug,
			title: wikiPage.title,
			searchText: wikiPage.searchText
		})
		.from(knowledgeLink)
		.leftJoin(
			wikiPage,
			and(
				eq(knowledgeLink.provider, 'builtin'),
				sql`${knowledgeLink.ref} = ${wikiPage.id}::text`,
				isNull(wikiPage.deletedAt)
			)
		)
		.where(and(eq(knowledgeLink.entityType, type), inArray(knowledgeLink.entityId, ids)))
		.orderBy(asc(knowledgeLink.position));
}

/** For the edit form: current title if the page is live, else the cached one. */
export async function listLinks(db: Executor, { type, id }: Entity): Promise<LinkView[]> {
	return (await load(db, type, [id])).map((r) => ({
		key: keyOf(r),
		title: r.title ?? r.cachedTitle,
		available: r.slug !== null
	}));
}

/** For the member's task page: title and a short preview of each page. */
export async function listTaskLinks(db: Executor, taskId: string): Promise<TaskLink[]> {
	return (await load(db, 'task', [taskId])).map((r) => {
		const text = (r.searchText ?? '').replace(/\s+/g, ' ').trim();
		return {
			key: keyOf(r),
			title: r.title ?? r.cachedTitle,
			available: r.slug !== null,
			slug: r.slug,
			preview: !text
				? null
				: text.length <= PREVIEW_LENGTH
					? text
					: `${text.slice(0, PREVIEW_LENGTH).replace(/\s+\S*$/, '')} …`
		};
	});
}

/**
 * Replace an entity's links with `keys` (already parsed by LinksInput).
 * New links must point at a live page; links the entity already has stay
 * even if their page is gone meanwhile, so saving a task never fails
 * because someone deleted a wiki page.
 */
export async function setLinks(db: Executor, { type, id }: Entity, keys: string[]) {
	const existing = new Map((await load(db, type, [id])).map((r) => [keyOf(r), r]));
	const refs = keys.map(refOf);
	const pages = refs.length
		? await db
				.select({ id: wikiPage.id, title: wikiPage.title })
				.from(wikiPage)
				.where(and(inArray(wikiPage.id, refs), isNull(wikiPage.deletedAt)))
		: [];
	const live = new Map(pages.map((p) => [p.id, p.title]));

	const rows = keys.map((key, position) => {
		const ref = refOf(key);
		const title = live.get(ref) ?? existing.get(key)?.cachedTitle;
		if (title === undefined) throw new ValidationError({ links: 'knowledge_link_not_found' });
		return {
			entityType: type,
			entityId: id,
			provider: 'builtin',
			ref,
			cachedTitle: title,
			position
		};
	});

	await deleteLinks(db, type, [id]);
	if (rows.length > 0) await db.insert(knowledgeLink).values(rows);
}

/** Copy all links of one entity to another (series → new occurrence). */
export async function copyLinks(db: Executor, from: Entity, to: Entity) {
	const rows = await db
		.select()
		.from(knowledgeLink)
		.where(and(eq(knowledgeLink.entityType, from.type), eq(knowledgeLink.entityId, from.id)));
	if (rows.length === 0) return;
	await db
		.insert(knowledgeLink)
		.values(
			rows.map(({ id: _, createdAt: __, ...r }) => ({ ...r, entityType: to.type, entityId: to.id }))
		)
		.onConflictDoNothing();
}

export async function deleteLinks(db: Executor, type: KnowledgeEntityType, ids: string[]) {
	if (ids.length === 0) return;
	await db
		.delete(knowledgeLink)
		.where(and(eq(knowledgeLink.entityType, type), inArray(knowledgeLink.entityId, ids)));
}
