import { asc, eq, sql } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { ledgerAccount, ledgerEntry, profile, user } from '@commonsdb/db/schema';
import { DomainError } from '../errors.ts';
import { type Actor, type PlatformRole, assertSuperadmin } from '../roles.ts';
import { parse } from '../validation.ts';
import { ensureUserAccount } from './internal.ts';
import { AdjustmentInput } from './schema.ts';

export type MemberBalance = {
	id: string;
	name: string;
	email: string;
	role: PlatformRole;
	balanceTenths: number;
};

/** Every user with their balance, by name. Superadmins only. */
export async function listMemberBalances(db: Db, actor: Actor): Promise<MemberBalance[]> {
	assertSuperadmin(actor);
	const name = sql<string>`coalesce(${profile.displayName}, ${user.name})`;
	return db
		.select({
			id: user.id,
			name,
			email: user.email,
			role: user.platformRole,
			balanceTenths: sql<number>`coalesce(sum(${ledgerEntry.amountTenths}), 0)`.mapWith(Number)
		})
		.from(user)
		.leftJoin(profile, eq(profile.userId, user.id))
		.leftJoin(ledgerAccount, eq(ledgerAccount.userId, user.id))
		.leftJoin(ledgerEntry, eq(ledgerEntry.accountId, ledgerAccount.id))
		.groupBy(user.id, profile.displayName)
		.orderBy(asc(name));
}

/**
 * A manual correction on a user's account, with a required reason.
 * Append-only like everything else: a wrong adjustment is fixed by another.
 */
export async function adjustBalance(db: Db, actor: Actor, userId: string, input: unknown) {
	assertSuperadmin(actor);
	const { amount, memo } = parse(AdjustmentInput, input);

	const target = await db.query.user.findFirst({
		where: eq(user.id, userId),
		columns: { id: true }
	});
	if (!target) throw new DomainError('user_not_found');

	await db.transaction(async (tx) => {
		const accountId = await ensureUserAccount(tx, userId);
		await tx.insert(ledgerEntry).values({
			accountId,
			amountTenths: amount,
			kind: 'adjustment',
			memo,
			actorId: actor.id
		});
	});
}
