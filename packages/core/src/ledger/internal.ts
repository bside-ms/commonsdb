import { eq } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { ledgerAccount, ledgerEntry } from '@commonsdb/db/schema';

/** A db or a transaction: both can insert and select. */
type Executor = Pick<Db, 'insert' | 'select'>;

/** The user's account id, created on first use. Safe to call twice. */
export async function ensureUserAccount(db: Executor, userId: string): Promise<string> {
	await db
		.insert(ledgerAccount)
		.values({ kind: 'user', userId })
		.onConflictDoNothing({ target: ledgerAccount.userId });
	const [a] = await db
		.select({ id: ledgerAccount.id })
		.from(ledgerAccount)
		.where(eq(ledgerAccount.userId, userId));
	return a.id;
}

/**
 * Credit a confirmed shift. Call inside the transaction that flips the
 * shift to 'confirmed'; the unique index makes a second credit fail.
 */
export async function creditShift(
	db: Executor,
	c: { shiftId: string; userId: string; amountTenths: number; actorId: string }
) {
	const accountId = await ensureUserAccount(db, c.userId);
	await db.insert(ledgerEntry).values({
		accountId,
		amountTenths: c.amountTenths,
		kind: 'shift_credit',
		shiftId: c.shiftId,
		actorId: c.actorId
	});
}
