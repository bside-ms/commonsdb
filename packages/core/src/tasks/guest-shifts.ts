/*
 * Guest shifts (slice 12b): confirming work done by someone without an
 * account, and crediting it once they redeem the code. Next to
 * confirmation.ts and for the same reason: shift → confirmed → ledger
 * is one path. For other core modules only, not exported.
 */
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { shift, task } from '@commonsdb/db/schema';
import { DomainError } from '../errors.ts';
import { creditShift } from '../ledger/internal.ts';
import { postTaskLogMessage } from '../messaging/internal.ts';
import { afterOccurrenceConfirmed } from './series/generator.ts';
import type { Tx } from './index.ts';

/**
 * Take the task's first free shift (or add one) and confirm it with no
 * assignee. Returns the shift id. Call inside the caller's transaction.
 */
export async function confirmGuestShift(
	tx: Tx,
	c: { taskId: string; hoursTenths: number; actorId: string }
): Promise<string> {
	const now = new Date();
	const done = {
		status: 'confirmed' as const,
		hoursTenths: c.hoursTenths,
		takenAt: now,
		reportedAt: now,
		confirmedAt: now,
		confirmedBy: c.actorId
	};

	const [free] = await tx
		.select({ id: shift.id })
		.from(shift)
		.where(and(eq(shift.taskId, c.taskId), eq(shift.status, 'open')))
		.orderBy(asc(shift.position), asc(shift.createdAt))
		.limit(1)
		.for('update', { skipLocked: true });

	let shiftId: string;
	if (free) {
		await tx.update(shift).set(done).where(eq(shift.id, free.id));
		shiftId = free.id;
	} else {
		const [row] = await tx
			.insert(shift)
			.values({
				taskId: c.taskId,
				position: sql`(select coalesce(max(${shift.position}), 0) + 1 from ${shift} where ${shift.taskId} = ${c.taskId})`,
				...done
			})
			.returning({ id: shift.id });
		shiftId = row.id;
	}
	await afterOccurrenceConfirmed(tx, c.taskId);
	return shiftId;
}

/**
 * A redeemed (or admin-assigned) guest shift gets its member and the
 * credit. `actorId` on the ledger entry: whoever confirmed it on site.
 */
export async function creditGuestShift(
	tx: Tx,
	c: { shiftId: string; userId: string; confirmedBy: string }
) {
	const [s] = await tx
		.select({ taskId: shift.taskId, hoursTenths: shift.hoursTenths, title: task.title })
		.from(shift)
		.innerJoin(task, eq(task.id, shift.taskId))
		.where(eq(shift.id, c.shiftId));
	if (!s) throw new DomainError('shift_not_found');

	// one shift per member per task (shift_one_per_member_idx)
	const own = await tx
		.select({ id: shift.id })
		.from(shift)
		.where(and(eq(shift.taskId, s.taskId), eq(shift.assigneeId, c.userId)))
		.limit(1);
	if (own.length) throw new DomainError('claim_already_on_task');

	const [row] = await tx
		.update(shift)
		.set({ assigneeId: c.userId })
		.where(and(eq(shift.id, c.shiftId), eq(shift.status, 'confirmed'), isNull(shift.assigneeId)))
		.returning({ id: shift.id });
	if (!row) throw new DomainError('claim_used');

	await creditShift(tx, {
		shiftId: c.shiftId,
		userId: c.userId,
		amountTenths: s.hoursTenths,
		actorId: c.confirmedBy
	});
	await postTaskLogMessage(tx, {
		memberId: c.userId,
		taskId: s.taskId,
		taskTitle: s.title,
		system: 'shift_confirmed',
		note: null,
		actorId: c.confirmedBy
	});
}
