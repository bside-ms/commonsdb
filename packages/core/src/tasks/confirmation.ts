import { and, asc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { category, profile, shift, task, type WhenKind } from '@commonsdb/db/schema';
import { DomainError } from '../errors.ts';
import { creditShift } from '../ledger/internal.ts';
import { isSuperadmin, type Actor } from '../roles.ts';
import { parse } from '../validation.ts';
import { canManageCategory, manageableCategories } from './policy.ts';
import { ConfirmInput, SendBackInput } from './schema.ts';
import { afterOccurrenceConfirmed } from './series/index.ts';
import { postTaskLogMessage } from '../messaging/internal.ts';
import { isLeadInWindow } from '../actions/index.ts';
import { localToday } from './shifts.ts';

export type ConfirmationItem = {
	shiftId: string;
	task: {
		id: string;
		title: string;
		whenKind: WhenKind;
		startsOn: string;
		endsOn: string | null;
		deleted: boolean;
	};
	category: { id: string; name: string };
	hoursTenths: number;
	assigneeName: string | null;
	reportedAt: Date;
	reportNote: string | null;
	/** The actor did this shift themselves (admins may not confirm it). */
	own: boolean;
	canConfirm: boolean;
};

/** Reported shifts matching `where`, oldest report first, with what the actor may do. */
async function selectReported(db: Db, actor: Actor, where: SQL[]): Promise<ConfirmationItem[]> {
	const rows = await db
		.select({
			shiftId: shift.id,
			hoursTenths: shift.hoursTenths,
			assigneeId: shift.assigneeId,
			reportedAt: shift.reportedAt,
			reportNote: shift.reportNote,
			taskId: task.id,
			title: task.title,
			whenKind: task.whenKind,
			startsOn: task.startsOn,
			endsOn: task.endsOn,
			deletedAt: task.deletedAt,
			categoryId: category.id,
			categoryName: category.name,
			assigneeName: profile.displayName
		})
		.from(shift)
		.innerJoin(task, eq(shift.taskId, task.id))
		.innerJoin(category, eq(task.categoryId, category.id))
		.leftJoin(profile, eq(profile.userId, shift.assigneeId))
		.where(and(eq(shift.status, 'reported'), ...where))
		.orderBy(asc(shift.reportedAt));
	return rows.map((r) => {
		const own = r.assigneeId === actor.id;
		return {
			shiftId: r.shiftId,
			task: {
				id: r.taskId,
				title: r.title,
				whenKind: r.whenKind,
				startsOn: r.startsOn,
				endsOn: r.endsOn,
				deleted: r.deletedAt !== null
			},
			category: { id: r.categoryId, name: r.categoryName },
			hoursTenths: r.hoursTenths,
			assigneeName: r.assigneeName,
			// reported shifts always have it; the fallback only satisfies the type
			reportedAt: r.reportedAt ?? new Date(0),
			reportNote: r.reportNote,
			own,
			canConfirm: r.assigneeId !== null && (!own || isSuperadmin(actor))
		};
	});
}

export async function listConfirmations(db: Db, actor: Actor): Promise<ConfirmationItem[]> {
	const scope = await manageableCategories(db, actor);
	if (scope !== 'all' && scope.length === 0) return [];
	return selectReported(db, actor, scope === 'all' ? [] : [inArray(task.categoryId, scope)]);
}

/**
 * Reported shifts of one Aktion, for its page. Leads in the window see
 * all of them; admins those in their categories; everyone else none.
 * Report notes included: whoever confirms needs them.
 */
export async function listConfirmationsForAction(
	db: Db,
	actor: Actor,
	actionId: string,
	{ today = localToday() }: { today?: string } = {}
): Promise<ConfirmationItem[]> {
	const lead = await isLeadInWindow(db, actor, actionId, today);
	const scope = lead ? 'all' : await manageableCategories(db, actor);
	if (scope !== 'all' && scope.length === 0) return [];
	const where: SQL[] = [eq(task.actionId, actionId), isNull(task.deletedAt)];
	if (scope !== 'all') where.push(inArray(task.categoryId, scope));
	return selectReported(db, actor, where);
}

/** A reported shift the actor manages, or the matching error. */
async function loadReported(db: Db, actor: Actor, shiftId: string, today: string) {
	const [s] = await db
		.select({
			status: shift.status,
			assigneeId: shift.assigneeId,
			categoryId: task.categoryId,
			actionId: task.actionId,
			taskId: task.id,
			taskTitle: task.title
		})
		.from(shift)
		.innerJoin(task, eq(shift.taskId, task.id))
		.where(eq(shift.id, shiftId));
	if (!s) throw new DomainError('shift_not_found');
	const allowed =
		(await canManageCategory(db, actor, s.categoryId)) ||
		(s.actionId !== null && (await isLeadInWindow(db, actor, s.actionId, today)));
	if (!allowed) throw new DomainError('forbidden');
	if (s.status !== 'reported') throw new DomainError('shift_not_reported');
	return s;
}

/**
 * Confirm a reported shift and credit the assignee, in one transaction.
 * The hours may be corrected here; the credit is what gets confirmed.
 * For an occurrence of a series, the series' next occurrences follow in
 * the same transaction (they may depend on this completion).
 */
export async function confirmShift(
	db: Db,
	actor: Actor,
	shiftId: string,
	input: unknown,
	{ today = localToday() }: { today?: string } = {}
) {
	const { hours, note } = parse(ConfirmInput, input);
	const s = await loadReported(db, actor, shiftId, today);
	if (!s.assigneeId) throw new DomainError('shift_no_assignee');
	if (s.assigneeId === actor.id && !isSuperadmin(actor)) {
		throw new DomainError('shift_confirm_own');
	}

	await db.transaction(async (tx) => {
		const [row] = await tx
			.update(shift)
			.set({
				status: 'confirmed',
				hoursTenths: hours,
				confirmedAt: new Date(),
				confirmedBy: actor.id,
				confirmNote: note
			})
			.where(and(eq(shift.id, shiftId), eq(shift.status, 'reported')))
			.returning({ assigneeId: shift.assigneeId, taskId: shift.taskId });

		// someone else confirmed or sent it back in the meantime
		if (!row?.assigneeId) throw new DomainError('shift_not_reported');

		await creditShift(tx, {
			shiftId,
			userId: row.assigneeId,
			amountTenths: hours,
			actorId: actor.id
		});
		await afterOccurrenceConfirmed(tx, row.taskId);
		// the thanks (or just "confirmed") lands in the member's inbox
		await postTaskLogMessage(tx, {
			memberId: row.assigneeId,
			taskId: row.taskId,
			taskTitle: s.taskTitle,
			system: 'shift_confirmed',
			note,
			actorId: actor.id
		});
	});
}

/**
 * Back to 'taken' with a reason. The assignee sees it on the task and,
 * as a message, in their inbox, where every send-back stays readable.
 */
export async function sendBackShift(
	db: Db,
	actor: Actor,
	shiftId: string,
	input: unknown,
	{ today = localToday() }: { today?: string } = {}
) {
	const { note } = parse(SendBackInput, input);
	const s = await loadReported(db, actor, shiftId, today);

	await db.transaction(async (tx) => {
		const [row] = await tx
			.update(shift)
			.set({ status: 'taken', reportedAt: null, sendBackNote: note })
			.where(and(eq(shift.id, shiftId), eq(shift.status, 'reported')))
			.returning({ assigneeId: shift.assigneeId });
		if (!row) throw new DomainError('shift_not_reported');
		if (row.assigneeId) {
			await postTaskLogMessage(tx, {
				memberId: row.assigneeId,
				taskId: s.taskId,
				taskTitle: s.taskTitle,
				system: 'shift_sent_back',
				note,
				actorId: actor.id
			});
		}
	});
}
