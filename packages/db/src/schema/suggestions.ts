import { relations, sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { category, task } from './tasks.ts';
import { upload } from './uploads.ts';

export const SUGGESTION_STATUSES = ['open', 'converted', 'rejected'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

/**
 * A member reports something (slice 7); an admin turns it into a task or
 * declines it. The category is the member's guess and routes it to that
 * category's admins; without one, every admin sees it.
 */
export const suggestion = pgTable(
	'suggestion',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		title: text('title').notNull(),
		body: text('body'),
		place: text('place'),
		categoryId: uuid('category_id').references(() => category.id, { onDelete: 'set null' }),
		imageId: uuid('image_id').references(() => upload.id, { onDelete: 'set null' }),
		status: text('status', { enum: SUGGESTION_STATUSES }).notNull().default('open'),
		/** Set on conversion, in the same transaction as the task. */
		taskId: uuid('task_id').references(() => task.id, { onDelete: 'set null' }),
		rejectionNote: text('rejection_note'),
		/** Audit fields, no FK. */
		createdBy: text('created_by').notNull(),
		handledBy: text('handled_by'),
		handledAt: timestamp('handled_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('suggestion_status_idx').on(t.status, t.createdAt),
		index('suggestion_created_by_idx').on(t.createdBy),
		check('suggestion_title_check', sql`length(${t.title}) between 1 and 200`),
		check('suggestion_handled_check', sql`(${t.status} = 'open') = (${t.handledAt} is null)`)
	]
);

export const suggestionRelations = relations(suggestion, ({ one }) => ({
	category: one(category, { fields: [suggestion.categoryId], references: [category.id] })
}));

export type Suggestion = typeof suggestion.$inferSelect;
