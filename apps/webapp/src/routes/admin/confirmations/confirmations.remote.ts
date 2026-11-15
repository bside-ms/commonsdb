/*
 * The confirmation queue. requireAdmin() on every function: remote
 * functions have their own URLs, the /admin guard doesn't cover them.
 * Scope (categories, own shifts) is decided in core.
 */
import { form, query } from '$app/server';
import * as v from 'valibot';
import { confirmShift, listConfirmations, sendBackShift } from '@commonsdb/core';
import { db } from '#lib/server/services.ts';
import { requireAdmin, toFormIssues, toHttpError } from '#lib/server/guards.ts';

const Id = v.pipe(v.string(), v.uuid());

export const confirmations = query(async () =>
	listConfirmations(db, requireAdmin()).catch(toHttpError)
);

export const confirm = form(
	v.object({ shiftId: Id, hours: v.string(), note: v.optional(v.string()) }),
	async ({ shiftId, ...input }) => {
		await confirmShift(db, requireAdmin(), shiftId, input).catch(toFormIssues);
		return { done: true };
	}
);

export const sendBack = form(
	v.object({ shiftId: Id, note: v.optional(v.string()) }),
	async ({ shiftId, ...input }) => {
		await sendBackShift(db, requireAdmin(), shiftId, input).catch(toFormIssues);
		return { done: true };
	}
);
