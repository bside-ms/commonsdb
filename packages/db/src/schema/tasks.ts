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
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';
import type { RichTextDoc } from '@commonsdb/richtext';
import { user } from './auth.ts';

export const WHEN_KINDS = ['date', 'range'] as const;
export type WhenKind = (typeof WHEN_KINDS)[number];

/** Slice 2 uses open/taken. reported/confirmed arrive with slice 3. */
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
		...timestamps
	},
	(t) => [
		index('task_category_idx').on(t.categoryId),
		check(
			'task_when_check',
			sql`(${t.whenKind} = 'date' and ${t.endsOn} is null)
                or (
                ${t.whenKind}
                =
                'range'
                and
                ${t.endsOn}
                is
                not
                null
                and
                ${t.endsOn}
                >=
                ${t.startsOn}
                )`
		)
	]
);

/**
 * A slot of work on a task. Slice 2: exactly one per task, no time window.
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
		startsAt: timestamp('starts_at', { withTimezone: true }),
		endsAt: timestamp('ends_at', { withTimezone: true }),
		hoursTenths: integer('hours_tenths').notNull(),
		status: text('status', { enum: SHIFT_STATUSES }).notNull().default('open'),
		assigneeId: text('assignee_id').references(() => user.id, { onDelete: 'set null' }),
		takenAt: timestamp('taken_at', { withTimezone: true }),
		...timestamps
	},
	(t) => [
		index('shift_task_idx').on(t.taskId),
		index('shift_assignee_idx').on(t.assigneeId),
		check(
			'shift_hours_check',
			sql`${t.hoursTenths}
            > 0`
		),
		check(
			'shift_status_check',
			sql`${t.status}
            in ('open', 'taken', 'reported', 'confirmed')`
		),
		// open shifts never have an assignee; the reverse isn't enforced, so
		// deleting a user (set null) can't fail on their old shifts
		check(
			'shift_open_unassigned_check',
			sql`${t.status}
            <> 'open' or
            ${t.assigneeId}
            is
            null`
		)
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

export const taskRelations = relations(task, ({ one, many }) => ({
	category: one(category, { fields: [task.categoryId], references: [category.id] }),
	shifts: many(shift)
}));

export const shiftRelations = relations(shift, ({ one }) => ({
	task: one(task, { fields: [shift.taskId], references: [task.id] }),
	assignee: one(user, { fields: [shift.assigneeId], references: [user.id] })
}));

export type SuperCategory = typeof superCategory.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Task = typeof task.$inferSelect;
export type Shift = typeof shift.$inferSelect;
