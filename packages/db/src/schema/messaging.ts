import { sql } from 'drizzle-orm';
import {
	check,
	index,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import type { RichTextDoc } from '@commonsdb/richtext';
import { user } from './auth.ts';
import { task } from './tasks.ts';

/**
 * admin: a member writes to all admins · direct: two people ·
 * group: several people · task: everyone holding a shift on the task.
 */
export const THREAD_KINDS = ['admin', 'direct', 'group', 'task'] as const;
export type ThreadKind = (typeof THREAD_KINDS)[number];

/** Messages written by the system, not a person. Wording lives in Paraglide. */
export const SYSTEM_MESSAGE_KINDS = ['shift_sent_back', 'shift_confirmed'] as const;
export type SystemMessageKind = (typeof SYSTEM_MESSAGE_KINDS)[number];

/**
 * A conversation. Who may read it is derived in core from the kind
 * (ROADMAP slice 6a), not stored: admin threads = the member + every
 * admin, task threads = current shift holders, direct/group = the
 * participant rows.
 */
export const thread = pgTable(
	'thread',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		kind: text('kind', { enum: THREAD_KINDS }).notNull(),
		subject: text('subject'),
		/** Task threads: the task. Admin threads: optional reference. */
		taskId: uuid('task_id').references(() => task.id, { onDelete: 'set null' }),
		/** Admin threads: the member who wrote to the admins. */
		memberId: text('member_id').references(() => user.id, {
			onDelete: 'set null'
		}),
		/** Direct threads: both user ids, sorted, joined by ':'. One thread per pair. */
		directKey: text('direct_key'),
		/** Admin threads that collect system messages for one member and task. */
		taskLog: text('task_log'),
		claimedBy: text('claimed_by').references(() => user.id, {
			onDelete: 'set null'
		}),
		archivedAt: timestamp('archived_at', { withTimezone: true }),
		/** Audit field: no FK, like ledger_entry.actor_id. */
		archivedBy: text('archived_by'),
		/** Soft delete for the admin inbox; the member keeps their copy. */
		adminDeletedAt: timestamp('admin_deleted_at', { withTimezone: true }),
		/** Later: "An Awareness melden" points here at the reported thread. */
		reportedThreadId: uuid('reported_thread_id'),
		lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
		/** Audit field, no FK. */
		createdBy: text('created_by'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('thread_member_idx').on(t.memberId),
		index('thread_task_idx').on(t.taskId),
		index('thread_last_message_idx').on(t.lastMessageAt),
		uniqueIndex('thread_direct_key_idx')
			.on(t.directKey)
			.where(sql`${t.kind} = 'direct'`),
		uniqueIndex('thread_task_chat_idx')
			.on(t.taskId)
			.where(sql`${t.kind} = 'task'`),
		uniqueIndex('thread_task_log_idx')
			.on(t.taskLog)
			.where(sql`${t.taskLog} is not null`),
		check('thread_kind_check', sql`${t.kind} in ('admin', 'direct', 'group', 'task')`),
		check('thread_direct_key_check', sql`(${t.kind} = 'direct') = (${t.directKey} is not null)`),
		check('thread_task_log_check', sql`${t.taskLog} is null or ${t.kind} = 'admin'`)
	]
);

/**
 * Per person and thread: read state and "removed from my inbox".
 * For direct/group threads the rows are also the access list. Admins and
 * task-chat members get a row the first time they open the thread.
 */
export const threadParticipant = pgTable(
	'thread_participant',
	{
		threadId: uuid('thread_id')
			.notNull()
			.references(() => thread.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		/** Everything up to here is read. */
		lastReadAt: timestamp('last_read_at', { withTimezone: true }),
		/** Hidden until a newer message arrives (hidden_at < thread.last_message_at). */
		hiddenAt: timestamp('hidden_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		primaryKey({ columns: [t.threadId, t.userId] }),
		index('thread_participant_user_idx').on(t.userId)
	]
);

export const message = pgTable(
	'message',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		threadId: uuid('thread_id')
			.notNull()
			.references(() => thread.id, { onDelete: 'cascade' }),
		/** Audit field, no FK: messages outlive their authors. Null for system messages. */
		authorId: text('author_id'),
		/** TipTap JSON, profile 'message'. Null once retracted. */
		body: jsonb('body').$type<RichTextDoc>(),
		system: text('system', { enum: SYSTEM_MESSAGE_KINDS }),
		retractedAt: timestamp('retracted_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('message_thread_idx').on(t.threadId, t.createdAt),
		check('message_author_check', sql`(${t.authorId} is null) = (${t.system} is not null)`),
		check('message_body_check', sql`(${t.body} is null) = (${t.retractedAt} is not null)`)
	]
);

/** blocker no longer receives direct or group messages from blocked. */
export const userBlock = pgTable(
	'user_block',
	{
		blockerId: text('blocker_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		blockedId: text('blocked_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		primaryKey({ columns: [t.blockerId, t.blockedId] }),
		check('user_block_self_check', sql`${t.blockerId} <> ${t.blockedId}`)
	]
);

export type Thread = typeof thread.$inferSelect;
export type ThreadParticipant = typeof threadParticipant.$inferSelect;
export type Message = typeof message.$inferSelect;
