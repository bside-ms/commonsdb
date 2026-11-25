/*
 * Members and their balances, manual adjustments. Superadmins only:
 * requireSuperadmin() on every function, the /admin guard only checks admin.
 */
import { form, query } from '$app/server';
import * as v from 'valibot';
import { adjustBalance, listMemberBalances, setPlatformRole } from '@commonsdb/core';
import { db } from '#lib/server/services.ts';
import { requireSuperadmin, toFormIssues, toHttpError } from '#lib/server/guards.ts';

export const memberBalances = query(async () =>
	listMemberBalances(db, requireSuperadmin()).catch(toHttpError)
);

// userId is Better Auth's text id, not a uuid; core checks it exists
export const adjust = form(
	v.object({
		userId: v.pipe(v.string(), v.nonEmpty()),
		amount: v.optional(v.string()),
		memo: v.optional(v.string())
	}),
	async ({ userId, ...input }) => {
		await adjustBalance(db, requireSuperadmin(), userId, input).catch(toFormIssues);
		return { done: true };
	}
);

/** Role change; core keeps at least one superadmin ('last_superadmin'). */
export const setRole = form(
	v.object({
		userId: v.pipe(v.string(), v.nonEmpty()),
		role: v.optional(v.string())
	}),
	async ({ userId, role }) => {
		await setPlatformRole(db, requireSuperadmin(), userId, { role }).catch(toFormIssues);
		await memberBalances().refresh();
		return { done: true };
	}
);
