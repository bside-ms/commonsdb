import { relations, sql } from 'drizzle-orm';
import {
	boolean,
	check,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	time,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import type { RichTextDoc } from '@commonsdb/richtext';
import type { SeriesRuleJson, ShiftTemplateJson } from './series-json.ts';
import { user } from './auth.ts';

export const WHEN_KINDS = ['date', 'range'] as const;
export type WhenKind = (typeof WHEN_KINDS)[number];

/** open → taken → reported → confirmed; reported can go back to taken. */
export const SHIFT_STATUSES = ['open', 'taken', 'reported', 'confirmed'] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
};

export const superCategory = pgTable('super_category', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	position: integer('position').notNull().default(0),
	...timestamps
});

export const category = pgTable(
	'category',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		superCategoryId: uuid('super_category_id')
			.notNull()
			.references(() => superCategory.id, { onDelete: 'restrict' }),
		name: text('name').notNull(),
		position: integer('position').notNull().default(0),
		...timestamps
	},
	(t) => [index('category_super_category_idx').on(t.superCategoryId)]
);

/**
 * Which categories an admin manages. Superadmins need no rows here.
 * Category is the only scope key for now (ROADMAP, slice 2 decisions).
 */
export const capability = pgTable(
	'capability',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		categoryId: uuid('category_id')
			.notNull()
			.references(() => category.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.userId, t.categoryId] })]
);

/**
 * A recurring task: the rule plus the template every occurrence is made
 * from (slice 5). Members never see a series, only its occurrences, which
 * are ordinary tasks with series_id set.
 */
export const taskSeries = pgTable(
	'task_series',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		// template: the same fields as task
		categoryId: uuid('category_id')
			.notNull()
			.references(() => category.id, { onDelete: 'restrict' }),
		title: text('title').notNull(),
		description: jsonb('description').$type<RichTextDoc>(),
		urgent: boolean('urgent').notNull().default(false),
		selfService: boolean('self_service').notNull().default(false),
		place: text('place'),
		contact: text('contact'),
		bring: text('bring'),
		physicalDemands: text('physical_demands'),
		/** Shifts every occurrence gets, in form order. */
		shiftTemplates: jsonb('shift_templates').$type<ShiftTemplateJson[]>().notNull(),
		// rule
		/** Repeat mode and its parameters; validated in core (SeriesRule). */
		rule: jsonb('rule').$type<SeriesRuleJson>().notNull(),
		/** First possible day; fixes the week parity for biweekly. */
		anchor: date('anchor', { mode: 'string' }).notNull(),
		/** Last possible day; null = open-ended. */
		until: date('until', { mode: 'string' }),
		/** Ranges: start at least this many days after the last completion. */
		minGapDays: integer('min_gap_days').notNull().default(0),
		/** How many future occurrences to keep ready. */
		lookahead: integer('lookahead').notNull().default(3),
		pausedAt: timestamp('paused_at', { withTimezone: true }),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
		...timestamps
	},
	(t) => [
		index('task_series_category_idx').on(t.categoryId),
		check('task_series_until_check', sql`${t.until} is null or ${t.until} >= ${t.anchor}`),
		check('task_series_min_gap_check', sql`${t.minGapDays} between 0 and 365`),
		check('task_series_lookahead_check', sql`${t.lookahead} between 1 and 12`)
	]
);

export const task = pgTable(
	'task',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		categoryId: uuid('category_id')
			.notNull()
			.references(() => category.id, { onDelete: 'restrict' }),
		title: text('title').notNull(),
		description: jsonb('description').$type<RichTextDoc>(),
		urgent: boolean('urgent').notNull().default(false),
		selfService: boolean('self_service').notNull().default(false),
		place: text('place'),
		contact: text('contact'),
		bring: text('bring'),
		physicalDemands: text('physical_demands'),
		whenKind: text('when_kind', { enum: WHEN_KINDS }).notNull(),
		startsOn: date('starts_on', { mode: 'string' }).notNull(),
		/** Only for 'range'. */
		endsOn: date('ends_on', { mode: 'string' }),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
		// occurrence of a series (slice 5); all null/false for one-off tasks
		seriesId: uuid('series_id').references(() => taskSeries.id, { onDelete: 'set null' }),
		/** The rule's period this occurrence fills ('w:2026-11-16'); null if added by hand. */
		periodKey: text('period_key'),
		/** Edited on its own: rule or template changes leave it alone. */
		seriesEdited: boolean('series_edited').notNull().default(false),
		...timestamps
	},
	(t) => [
		index('task_category_idx').on(t.categoryId),
		index('task_series_idx').on(t.seriesId),
		// the generator's idempotency: one occurrence per period and series
		uniqueIndex('task_series_period_idx')
			.on(t.seriesId, t.periodKey)
			.where(sql`${t.periodKey} is not null`),
		check(
			'task_when_check',
			sql`(${t.whenKind} = 'date' and ${t.endsOn} is null) or (${t.whenKind} = 'range' and ${t.endsOn} is not null and ${t.endsOn} >= ${t.startsOn})`
		)
	]
);

/**
 * A slot of work on a task. A task has one or more (slice 4), each with an
 * optional local time window and its own hours.
 * Hours as integer tenths (15 = 1.5 h): repros are hours 1:1 (slice 3),
 * and integers keep balance sums exact.
 */
export const shift = pgTable(
	'shift',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		taskId: uuid('task_id')
			.notNull()
			.references(() => task.id, { onDelete: 'cascade' }),
		/** Local time of day, like the task's dates. Both or neither; none = any time. */
		startsTime: time('starts_time'),
		endsTime: time('ends_time'),
		/** The window ends after midnight (22:00–02:00). Set by core from the times. */
		endsNextDay: boolean('ends_next_day').notNull().default(false),
		/** Order on the task form; ties between equal start times follow it. */
		position: integer('position').notNull().default(0),
		hoursTenths: integer('hours_tenths').notNull(),
		status: text('status', { enum: SHIFT_STATUSES }).notNull().default('open'),
		assigneeId: text('assignee_id').references(() => user.id, { onDelete: 'set null' }),
		takenAt: timestamp('taken_at', { withTimezone: true }),
		reportedAt: timestamp('reported_at', { withTimezone: true }),
		reportNote: text('report_note'),
		/** Why an admin sent the report back. Cleared when reported again. */
		sendBackNote: text('send_back_note'),
		confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
		/** Who confirmed. Audit field: no FK, like ledger_entry.actor_id. */
		confirmedBy: text('confirmed_by'),
		/** Optional thanks from the confirming admin, shown on the account screen. */
		confirmNote: text('confirm_note'),
		...timestamps
	},
	(t) => [
		index('shift_task_idx').on(t.taskId),
		index('shift_assignee_idx').on(t.assigneeId),
		check('shift_hours_check', sql`${t.hoursTenths} > 0`),
		check('shift_status_check', sql`${t.status} in ('open', 'taken', 'reported', 'confirmed')`),
		// open shifts never have an assignee; the reverse isn't enforced, so
		// deleting a user (set null) can't fail on their old shifts
		check('shift_open_unassigned_check', sql`${t.status} <> 'open' or ${t.assigneeId} is null`),
		check(
			'shift_time_check',
			sql`(${t.startsTime} is null and ${t.endsTime} is null and not ${t.endsNextDay}) or (${t.startsTime} is not null and ${t.endsTime} is not null and ${t.endsNextDay} = (${t.endsTime} <= ${t.startsTime}))`
		), // one shift per member per task (slice 4). Drop this index if double shifts become a thing.
		uniqueIndex('shift_one_per_member_idx')
			.on(t.taskId, t.assigneeId)
			.where(sql`${t.assigneeId} is not null`)
	]
);

// Relations only feed db.query.* (relational queries); they add no FKs.
export const superCategoryRelations = relations(superCategory, ({ many }) => ({
	categories: many(category)
}));

export const categoryRelations = relations(category, ({ one, many }) => ({
	superCategory: one(superCategory, {
		fields: [category.superCategoryId],
		references: [superCategory.id]
	}),
	tasks: many(task),
	capabilities: many(capability)
}));

export const capabilityRelations = relations(capability, ({ one }) => ({
	category: one(category, { fields: [capability.categoryId], references: [category.id] }),
	user: one(user, { fields: [capability.userId], references: [user.id] })
}));

export const taskSeriesRelations = relations(taskSeries, ({ one, many }) => ({
	category: one(category, { fields: [taskSeries.categoryId], references: [category.id] }),
	occurrences: many(task)
}));

export const taskRelations = relations(task, ({ one, many }) => ({
	category: one(category, { fields: [task.categoryId], references: [category.id] }),
	series: one(taskSeries, { fields: [task.seriesId], references: [taskSeries.id] }),
	shifts: many(shift)
}));

export const shiftRelations = relations(shift, ({ one }) => ({
	task: one(task, { fields: [shift.taskId], references: [task.id] }),
	assignee: one(user, { fields: [shift.assigneeId], references: [user.id] })
}));

export type SuperCategory = typeof superCategory.$inferSelect;
export type Category = typeof category.$inferSelect;
export type TaskSeries = typeof taskSeries.$inferSelect;
export type Task = typeof task.$inferSelect;
export type Shift = typeof shift.$inferSelect;
