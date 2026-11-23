import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { RichTextDoc } from '@commonsdb/richtext';

/**
 * Pages whose text the space edits at runtime (slice 7): 'about' now,
 * the house rules likely next. Content, not i18n (ARCHITECTURE). A row
 * appears on first save; until then the page is empty.
 */
export const sitePage = pgTable('site_page', {
	slug: text('slug').primaryKey(),
	/** TipTap JSON, profile 'wiki'. null = emptied. */
	body: jsonb('body').$type<RichTextDoc>(),
	/** Audit fields, no FK. */
	updatedBy: text('updated_by'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type SitePage = typeof sitePage.$inferSelect;
