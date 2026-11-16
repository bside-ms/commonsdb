import { sql } from 'drizzle-orm';
import {
	check,
	customType,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';
import type { RichTextDoc } from '@commonsdb/richtext';

const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });

/**
 * A page of the built-in wiki (KnowledgeProvider 'builtin'). Content lives
 * in revisions; the page points at the current one. Links from tasks etc.
 * use the page id as `ref`, so renaming (and a new slug) breaks nothing.
 */
export const wikiPage = pgTable(
	'wiki_page',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		/** From the title on creation, kept on rename (shared links stay valid). */
		slug: text('slug').notNull(),
		title: text('title').notNull(),
		parentId: uuid('parent_id').references((): AnyPgColumn => wikiPage.id, {
			onDelete: 'restrict'
		}),
		position: integer('position').notNull().default(0),
		/** The revision shown. No FK: page and revision point at each other. */
		currentRevisionId: uuid('current_revision_id'),
		/** Plain text of the current revision, written by core; feeds `search`. */
		searchText: text('search_text').notNull().default(''),
		search: tsvector('search').generatedAlwaysAs(
			sql`setweight(to_tsvector('german', title), 'A') || setweight(to_tsvector('german', search_text), 'B')`
		),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
		/** Audit fields, no FK. */
		deletedBy: text('deleted_by'),
		createdBy: text('created_by'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('wiki_page_slug_idx').on(t.slug),
		index('wiki_page_parent_idx').on(t.parentId, t.position),
		index('wiki_page_search_idx').using('gin', t.search),
		check('wiki_page_title_check', sql`length(${t.title}) between 1 and 200`)
	]
);

/** Every save is a new, never-changed revision. Restoring = a new revision with old content. */
export const wikiRevision = pgTable(
	'wiki_revision',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		pageId: uuid('page_id')
			.notNull()
			.references(() => wikiPage.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		/** TipTap JSON, profile 'wiki'. Null = empty page. */
		content: jsonb('content').$type<RichTextDoc>(),
		/** Audit field, no FK: revisions outlive their authors. */
		authorId: text('author_id'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('wiki_revision_page_idx').on(t.pageId, t.createdAt)]
);

export const KNOWLEDGE_ENTITY_TYPES = ['task', 'series'] as const;
export type KnowledgeEntityType = (typeof KNOWLEDGE_ENTITY_TYPES)[number];

/**
 * Provider-neutral link from one of our entities to a knowledge entry
 * (ARCHITECTURE.md, KnowledgeProvider). `ref` is whatever the provider
 * uses as id (built-in: wiki_page.id; Outline: the document id).
 * `cached_title` keeps lists readable when the provider is slow or gone.
 */
export const knowledgeLink = pgTable(
	'knowledge_link',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		entityType: text('entity_type', { enum: KNOWLEDGE_ENTITY_TYPES }).notNull(),
		/** No FK: points at different tables; core deletes links with their entity. */
		entityId: uuid('entity_id').notNull(),
		provider: text('provider').notNull(),
		ref: text('ref').notNull(),
		cachedTitle: text('cached_title').notNull(),
		position: integer('position').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('knowledge_link_unique_idx').on(t.entityType, t.entityId, t.provider, t.ref),
		index('knowledge_link_entity_idx').on(t.entityType, t.entityId, t.position),
		index('knowledge_link_ref_idx').on(t.provider, t.ref),
		check('knowledge_link_entity_type_check', sql`${t.entityType} in ('task', 'series')`)
	]
);

export type WikiPage = typeof wikiPage.$inferSelect;
export type WikiRevision = typeof wikiRevision.$inferSelect;
export type KnowledgeLink = typeof knowledgeLink.$inferSelect;
