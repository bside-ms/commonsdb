/*
 * Redeeming a guest code (slice 12b): from the QR link or the field on
 * the account page. Needs an account; hooks send people through login
 * and onboarding and back here.
 */
import { form } from '$app/server';
import { redeemGuestCode } from '@commonsdb/core';
import { db } from '#lib/server/services.ts';
import { requireActor, toFormIssues } from '#lib/server/guards.ts';

export const redeem = form('unchecked', async (input: { code: string }) => {
	try {
		return await redeemGuestCode(db, requireActor(), input);
	} catch (e) {
		toFormIssues(e);
	}
});
