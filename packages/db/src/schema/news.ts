import { relations, sql } from 'drizzle-orm';
import {
	boolean,
	check,
	date,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';
import type { RichTextDoc } from '@commonsdb/richtext';
import { profile } from './profile.ts';

/**
 * News on the start page (slice 7). Admins write them; every member reads.
 * A post without `published_at` is a draft. `visible_until` (a day,
 * inclusive) takes it off the start page; it stays in the archive.
 */
export const news = pgTable(
	'news',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		title: text('title').notNull(),
		/** TipTap JSON, profile 'news'. */
		body: jsonb('body').$type<RichTextDoc>().notNull(),
		pinned: boolean('pinned').notNull().default(false),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		visibleUntil: date('visible_until', { mode: 'string' }),
		/** Audit fields, no FK. */
		createdBy: text('created_by').notNull(),
		updatedBy: text('updated_by'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('news_published_idx').on(t.publishedAt),
		check('news_title_check', sql`length(${t.title}) between 1 and 200`)
	]
);

export const newsRelations = relations(news, ({ one }) => ({
	author: one(profile, { fields: [news.createdBy], references: [profile.userId] })
}));

export type News = typeof news.$inferSelect;
