import { form, query } from '$app/server';
import * as v from 'valibot';
import {
	assignGuestClaim,
	listGuestClaimsForAdmin,
	listLeadChoices,
	reissueGuestCode
} from '@commonsdb/core';
import { db } from '#lib/server/services.ts';
import { requireAdmin, toFormIssues, toHttpError } from '#lib/server/guards.ts';

const Id = v.pipe(v.string(), v.uuid());

export const adminClaims = query(async () =>
	listGuestClaimsForAdmin(db, requireAdmin()).catch(toHttpError)
);

/** Same list as for Aktion leads: everyone with a profile. */
export const people = query(async () => listLeadChoices(db, requireAdmin()).catch(toHttpError));

export const assignClaim = form(
	v.object({ claimId: Id, userId: v.string() }),
	async ({ claimId, userId }) => {
		await assignGuestClaim(db, requireAdmin(), claimId, { userId }).catch(toFormIssues);
	}
);

export const reissueClaim = form(v.object({ claimId: Id }), async ({ claimId }) => {
	try {
		return await reissueGuestCode(db, requireAdmin(), claimId);
	} catch (e) {
		toFormIssues(e);
	}
});
