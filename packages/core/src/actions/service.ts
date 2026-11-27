/*
 * Aktionen: days where pre-picked tasks are done together (e.g.
 * "Repro-Arbeitstag"). Admins create them and mark tasks; every member
 * sees published ones. Leads are shown now and get rights with guest
 * credit (next slice).
 */
import { and, asc, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { action, actionLead, profile, task } from '@commonsdb/db/schema';
import type { RichTextDoc } from '@commonsdb/richtext';
import { DomainError } from '../errors.ts';
import { isAdmin, type Actor } from '../roles.ts';
import { parse } from '../validation.ts';
import { assertManagesCategory } from '../tasks/policy.ts';
import { localToday } from '../tasks/shifts.ts';
import { ActionInput } from './schema.ts';
import type { Tx } from '../tasks/index.ts';

export type ActionItem = {
	id: string;
	title: string;
	description: RichTextDoc | null;
	date: string;
	startsTime: string | null;
	endsTime: string | null;
	place: string | null;
	publishedAt: Date | null;
	leads: { id: string; name: string }[];
};

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

function assertEditor(actor: Actor) {
	if (!isAdmin(actor)) throw new DomainError('forbidden');
}

async function withLeads(db: Db, rows: (typeof action.$inferSelect)[]): Promise<ActionItem[]> {
	if (rows.length === 0) return [];
	const leads = await db
		.select({ actionId: actionLead.actionId, id: actionLead.userId, name: profile.displayName })
		.from(actionLead)
		.innerJoin(profile, eq(profile.userId, actionLead.userId))
		.where(
			inArray(
				actionLead.actionId,
				rows.map((r) => r.id)
			)
		)
		.orderBy(asc(profile.displayName));
	return rows.map((r) => ({
		id: r.id,
		title: r.title,
		description: r.description,
		date: r.date,
		startsTime: hhmm(r.startsTime),
		endsTime: hhmm(r.endsTime),
		place: r.place,
		publishedAt: r.publishedAt,
		leads: leads.filter((l) => l.actionId === r.id).map(({ id, name }) => ({ id, name }))
	}));
}

// ---- reading (every member) -------------------------------------------------

/** Published, today or later, soonest first. For Start and the task list. */
export async function listUpcomingActions(
	db: Db,
	{ today = localToday(), limit = 3 }: { today?: string; limit?: number } = {}
): Promise<ActionItem[]> {
	const rows = await db
		.select()
		.from(action)
		.where(and(isNotNull(action.publishedAt), gte(action.date, today)))
		.orderBy(asc(action.date), asc(action.startsTime))
		.limit(limit);
	return withLeads(db, rows);
}

/** One Aktion. Drafts only for admins. */
export async function getAction(db: Db, actor: Actor, id: string): Promise<ActionItem> {
	const row = await db.query.action.findFirst({ where: eq(action.id, id) });
	if (!row || (!row.publishedAt && !isAdmin(actor))) throw new DomainError('action_not_found');
	const [item] = await withLeads(db, [row]);
	return item;
}

/** For core: may a member open tasks of this Aktion even when they're full? */
export async function isPublishedAction(db: Db, id: string) {
	const row = await db.query.action.findFirst({
		where: and(eq(action.id, id), isNotNull(action.publishedAt)),
		columns: { id: true }
	});
	return row !== undefined;
}

/** For the guest slice: is the actor a lead of this Aktion? */
export async function isActionLead(db: Db, actor: Actor, actionId: string) {
	const row = await db.query.actionLead.findFirst({
		where: and(eq(actionLead.actionId, actionId), eq(actionLead.userId, actor.id)),
		columns: { userId: true }
	});
	return row !== undefined;
}

// ---- writing (admins) -------------------------------------------------------

/** Upcoming first (soonest on top), then past ones (newest on top). */
export async function listActionsForAdmin(db: Db, actor: Actor): Promise<ActionItem[]> {
	assertEditor(actor);
	const rows = await db
		.select()
		.from(action)
		.orderBy(
			sql`${action.date} < current_date`,
			sql`case when ${action.date} >= current_date then ${action.date} end asc`,
			sql`${action.date} desc`
		);
	return withLeads(db, rows);
}

async function setLeads(tx: Tx, actionId: string, leadIds: string[]) {
	await tx.delete(actionLead).where(eq(actionLead.actionId, actionId));
	if (leadIds.length) {
		await tx.insert(actionLead).values(leadIds.map((userId) => ({ actionId, userId })));
	}
}

export async function createAction(db: Db, actor: Actor, input: unknown): Promise<string> {
	assertEditor(actor);
	const { published, leadIds, ...data } = parse(ActionInput, input);
	return db.transaction(async (tx) => {
		const [row] = await tx
			.insert(action)
			.values({
				...data,
				publishedAt: published ? new Date() : null,
				createdBy: actor.id,
				updatedBy: actor.id
			})
			.returning({ id: action.id });
		await setLeads(tx, row.id, leadIds);
		return row.id;
	});
}

export async function updateAction(db: Db, actor: Actor, id: string, input: unknown) {
	assertEditor(actor);
	const { published, leadIds, ...data } = parse(ActionInput, input);
	await db.transaction(async (tx) => {
		const existing = await tx.query.action.findFirst({
			where: eq(action.id, id),
			columns: { publishedAt: true }
		});
		if (!existing) throw new DomainError('action_not_found');
		await tx
			.update(action)
			.set({
				...data,
				publishedAt: published ? (existing.publishedAt ?? new Date()) : null,
				updatedBy: actor.id,
				updatedAt: new Date()
			})
			.where(eq(action.id, id));
		await setLeads(tx, id, leadIds);
	});
}

/** Tasks stay, they just lose the mark (FK: set null). */
export async function deleteAction(db: Db, actor: Actor, id: string) {
	assertEditor(actor);
	const gone = await db.delete(action).where(eq(action.id, id)).returning({ id: action.id });
	if (!gone.length) throw new DomainError('action_not_found');
}

/** Mark a task for an Aktion, or unmark it (actionId null). Needs the task's category. */
export async function markTaskForAction(
	db: Db,
	actor: Actor,
	taskId: string,
	actionId: string | null
) {
	const t = await db.query.task.findFirst({
		where: eq(task.id, taskId),
		columns: { categoryId: true, deletedAt: true }
	});
	if (!t || t.deletedAt) throw new DomainError('task_not_found');
	await assertManagesCategory(db, actor, t.categoryId);
	if (actionId) {
		const a = await db.query.action.findFirst({
			where: eq(action.id, actionId),
			columns: { id: true }
		});
		if (!a) throw new DomainError('action_not_found');
	}
	await db.update(task).set({ actionId }).where(eq(task.id, taskId));
}

/** People who can be picked as leads: everyone with a profile. */
export async function listLeadChoices(db: Db, actor: Actor) {
	assertEditor(actor);
	return db
		.select({ id: profile.userId, name: profile.displayName })
		.from(profile)
		.where(isNotNull(profile.onboardedAt))
		.orderBy(asc(profile.displayName));
}
