import { relations, sql } from 'drizzle-orm';
import {
	check,
	date,
	index,
	jsonb,
	pgTable,
	primaryKey,
	text,
	time,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';
import type { RichTextDoc } from '@commonsdb/richtext';
import { user } from './auth.ts';
import { profile } from './profile.ts';

/**
 * An Aktion (e.g. "Repro-Arbeitstag"): a day where pre-picked tasks are
 * done together. Tasks point to it (task.action_id). Without
 * `published_at` it's a draft only admins see.
 */
export const action = pgTable(
	'action',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		title: text('title').notNull(),
		/** TipTap JSON, profile 'description'. */
		description: jsonb('description').$type<RichTextDoc>(),
		date: date('date', { mode: 'string' }).notNull(),
		startsTime: time('starts_time'),
		endsTime: time('ends_time'),
		place: text('place'),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		/** Audit fields, no FK. */
		createdBy: text('created_by').notNull(),
		updatedBy: text('updated_by'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('action_date_idx').on(t.date),
		check('action_title_check', sql`length(${t.title}) between 1 and 200`),
		check('action_times_check', sql`(${t.startsTime} is null) = (${t.endsTime} is null)`)
	]
);

/** Day leads ("Tagesleitung"). Rights come with guest credit; for now they're shown. */
export const actionLead = pgTable(
	'action_lead',
	{
		actionId: uuid('action_id')
			.notNull()
			.references(() => action.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.actionId, t.userId] })]
);

export const actionRelations = relations(action, ({ many }) => ({
	leads: many(actionLead)
}));

export const actionLeadRelations = relations(actionLead, ({ one }) => ({
	action: one(action, { fields: [actionLead.actionId], references: [action.id] }),
	profile: one(profile, { fields: [actionLead.userId], references: [profile.userId] })
}));

export type Action = typeof action.$inferSelect;
