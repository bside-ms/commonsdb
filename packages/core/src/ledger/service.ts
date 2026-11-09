import { desc, eq, sql } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { ledgerAccount, ledgerEntry, shift, task, type LedgerKind } from '@commonsdb/db/schema';
import type { Actor } from '../roles.ts';

export type LedgerEntryView = {
	id: string;
	amountTenths: number;
	kind: LedgerKind;
	memo: string | null;
	createdAt: Date;
	task: { id: string; title: string } | null;
};

export type OwnAccount = { balanceTenths: number; entries: LedgerEntryView[] };

/** The actor's balance and latest entries. No account yet → 0, no entries. */
export async function getOwnAccount(db: Db, actor: Actor, limit = 50): Promise<OwnAccount> {
	const [balance] = await db
		.select({
			tenths: sql<number>`coalesce(sum(${ledgerEntry.amountTenths}), 0)`.mapWith(Number)
		})
		.from(ledgerEntry)
		.innerJoin(ledgerAccount, eq(ledgerEntry.accountId, ledgerAccount.id))
		.where(eq(ledgerAccount.userId, actor.id));

	const rows = await db
		.select({
			id: ledgerEntry.id,
			amountTenths: ledgerEntry.amountTenths,
			kind: ledgerEntry.kind,
			memo: ledgerEntry.memo,
			createdAt: ledgerEntry.createdAt,
			taskId: task.id,
			taskTitle: task.title
		})
		.from(ledgerEntry)
		.innerJoin(ledgerAccount, eq(ledgerEntry.accountId, ledgerAccount.id))
		.leftJoin(shift, eq(ledgerEntry.shiftId, shift.id))
		.leftJoin(task, eq(shift.taskId, task.id))
		.where(eq(ledgerAccount.userId, actor.id))
		.orderBy(desc(ledgerEntry.createdAt), desc(ledgerEntry.id))
		.limit(limit);

	return {
		balanceTenths: balance.tenths,
		entries: rows.map(({ taskId, taskTitle, ...e }) => ({
			...e,
			task: taskId && taskTitle ? { id: taskId, title: taskTitle } : null
		}))
	};
}
