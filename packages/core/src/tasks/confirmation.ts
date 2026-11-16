import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { category, profile, shift, task, type WhenKind } from '@commonsdb/db/schema';
import { DomainError } from '../errors.ts';
import { creditShift } from '../ledger/internal.ts';
import { isSuperadmin, type Actor } from '../roles.ts';
import { parse } from '../validation.ts';
import { assertManagesCategory, manageableCategories } from './policy.ts';
import { ConfirmInput, SendBackInput } from './schema.ts';
import { afterOccurrenceConfirmed } from './series/generator.ts';

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

/**
 * Reported shifts in the actor's categories, oldest report first.
 * Includes soft-deleted tasks: deleting a task must not cost anyone repros.
 */
export async function listConfirmations(db: Db, actor: Actor): Promise<ConfirmationItem[]> {
	const scope = await manageableCategories(db, actor);
	if (scope !== 'all' && scope.length === 0) return [];

	const where: SQL[] = [eq(shift.status, 'reported')];
	if (scope !== 'all') where.push(inArray(task.categoryId, scope));

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
		.where(and(...where))
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

/** A reported shift the actor manages, or the matching error. */
async function loadReported(db: Db, actor: Actor, shiftId: string) {
	const [s] = await db
		.select({ status: shift.status, assigneeId: shift.assigneeId, categoryId: task.categoryId })
		.from(shift)
		.innerJoin(task, eq(shift.taskId, task.id))
		.where(eq(shift.id, shiftId));
	if (!s) throw new DomainError('shift_not_found');
	await assertManagesCategory(db, actor, s.categoryId);
	if (s.status !== 'reported') throw new DomainError('shift_not_reported');
	return s;
}

/**
 * Confirm a reported shift and credit the assignee, in one transaction.
 * The hours may be corrected here; the credit is what gets confirmed.
 * For an occurrence of a series, the series' next occurrences follow in
 * the same transaction (they may depend on this completion).
 */
export async function confirmShift(db: Db, actor: Actor, shiftId: string, input: unknown) {
	const { hours, note } = parse(ConfirmInput, input);
	const s = await loadReported(db, actor, shiftId);
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
	});
}

/** Back to 'taken' with a reason; the assignee sees it on the task. */
export async function sendBackShift(db: Db, actor: Actor, shiftId: string, input: unknown) {
	const { note } = parse(SendBackInput, input);
	await loadReported(db, actor, shiftId);

	const [row] = await db
		.update(shift)
		.set({ status: 'taken', reportedAt: null, sendBackNote: note })
		.where(and(eq(shift.id, shiftId), eq(shift.status, 'reported')))
		.returning({ id: shift.id });
	if (!row) throw new DomainError('shift_not_reported');
}
