/*
 * Platform roles (member | admin | superadmin), set by superadmins in the
 * app instead of SQL. Superadmins may make others superadmin too. The one
 * rule: there is always at least one superadmin, so nobody (the last one
 * included) can demote the last one.
 */
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import type { Db } from '@commonsdb/db';
import { user } from '@commonsdb/db/schema';
import { DomainError } from '../errors.ts';
import { PLATFORM_ROLES, assertSuperadmin, type Actor, type PlatformRole } from '../roles.ts';
import { parse } from '../validation.ts';

export const RoleInput = v.object({
	role: v.picklist(PLATFORM_ROLES, 'role_invalid')
});

/**
 * Set a user's platform role. Runs in one transaction that locks every
 * superadmin row first: two superadmins demoting each other at the same
 * moment are serialised, and the second sees only one left and is refused
 * ('last_superadmin').
 */
export async function setPlatformRole(
	db: Db,
	actor: Actor,
	userId: string,
	input: unknown
): Promise<PlatformRole> {
	assertSuperadmin(actor);
	const { role } = parse(RoleInput, input);

	return db.transaction(async (tx) => {
		const superadmins = await tx
			.select({ id: user.id })
			.from(user)
			.where(eq(user.platformRole, 'superadmin'))
			.for('update');

		const [target] = await tx
			.select({ role: user.platformRole })
			.from(user)
			.where(eq(user.id, userId))
			.for('update');
		if (!target) throw new DomainError('user_not_found');
		if (target.role === role) return role;

		if (target.role === 'superadmin' && superadmins.length <= 1) {
			throw new DomainError('last_superadmin');
		}

		await tx.update(user).set({ platformRole: role }).where(eq(user.id, userId));
		return role;
	});
}
