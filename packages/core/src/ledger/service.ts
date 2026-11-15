import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Db } from '@commonsdb/db';
import {
	ledgerAccount,
	ledgerEntry,
	profile,
	shift,
	task,
	type LedgerKind
} from '@commonsdb/db/schema';
import type { Actor } from '../roles.ts';

export type LedgerEntryView = {
	id: string;
	amountTenths: number;
	kind: LedgerKind;
	memo: string | null;
	createdAt: Date;
	task: { id: string; title: string } | null;
	/** The confirming admin's note on a shift credit. `from` is null if they're gone. */
	thanks: { note: string; from: string | null } | null;
};

export type OwnAccount = { balanceTenths: number; entries: LedgerEntryView[] };

/** The actor's balance. No account yet → 0. */
export async function getOwnBalance(db: Db, actor: Actor): Promise<number> {
	const [row] = await db
		.select({
			tenths: sql<number>`coalesce(sum(${ledgerEntry.amountTenths}), 0)`.mapWith(Number)
		})
		.from(ledgerEntry)
		.innerJoin(ledgerAccount, eq(ledgerEntry.accountId, ledgerAccount.id))
		.where(eq(ledgerAccount.userId, actor.id));
	return row.tenths;
}

// the confirming admin's profile, next to the task's join chain
const confirmer = alias(profile, 'confirmer');

/** The actor's balance and latest entries, newest first. */
export async function getOwnAccount(db: Db, actor: Actor, limit = 50): Promise<OwnAccount> {
	const rows = await db
		.select({
			id: ledgerEntry.id,
			amountTenths: ledgerEntry.amountTenths,
			kind: ledgerEntry.kind,
			memo: ledgerEntry.memo,
			createdAt: ledgerEntry.createdAt,
			taskId: task.id,
			taskTitle: task.title,
			confirmNote: shift.confirmNote,
			confirmerName: confirmer.displayName
		})
		.from(ledgerEntry)
		.innerJoin(ledgerAccount, eq(ledgerEntry.accountId, ledgerAccount.id))
		.leftJoin(shift, eq(ledgerEntry.shiftId, shift.id))
		.leftJoin(task, eq(shift.taskId, task.id))
		.leftJoin(confirmer, eq(confirmer.userId, shift.confirmedBy))
		.where(eq(ledgerAccount.userId, actor.id))
		.orderBy(desc(ledgerEntry.createdAt), desc(ledgerEntry.id))
		.limit(limit);

	return {
		balanceTenths: await getOwnBalance(db, actor),
		entries: rows.map(({ taskId, taskTitle, confirmNote, confirmerName, ...e }) => ({
			...e,
			task: taskId && taskTitle ? { id: taskId, title: taskTitle } : null,
			thanks:
				e.kind === 'shift_credit' && confirmNote ? { note: confirmNote, from: confirmerName } : null
		}))
	};
}
