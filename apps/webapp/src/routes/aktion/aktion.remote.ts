/*
 * Aktionen for members: the day page and the teaser on Start / tasks.
 */
import { form, getRequestEvent, query } from '$app/server';
import * as v from 'valibot';
import {
	canRecordGuestsForAction,
	getAction,
	getTaskForMember,
	listTasksForAction,
	listUpcomingActions,
	recordGuestWork
} from '@commonsdb/core';
import { toHtml } from '@commonsdb/richtext';
import { db } from '#lib/server/services.ts';
import { requireActor, toFormIssues, toHttpError } from '#lib/server/guards.ts';
import QRCode from 'qrcode';

const Id = v.pipe(v.string(), v.uuid());

export const upcomingActions = query(async () => {
	requireActor();
	return listUpcomingActions(db);
});

export const actionPage = query(Id, async (id) => {
	const actor = requireActor();
	const item = await getAction(db, actor, id).catch(toHttpError);
	const [tasks, canRecordGuests] = await Promise.all([
		listTasksForAction(db, actor, id),
		canRecordGuestsForAction(db, actor, id)
	]);
	return {
		...item,
		html: item.description ? toHtml('description', item.description) : null,
		tasks,
		canRecordGuests
	};
});

/** For the guest form: the task and a hours suggestion (first free shift). */
export const guestTask = query(Id, async (taskId) => {
	const t = await getTaskForMember(db, requireActor(), taskId).catch(toHttpError);
	const free = t.shifts.find((s) => s.status === 'open');
	return { id: t.id, title: t.title, hoursTenths: free?.hoursTenths ?? 10 };
});

export type GuestFormData = { taskId: string; hours: string; guestName?: string };

/** Confirm guest work; returns the code once, with its QR (SVG) for the slip. */
export const recordGuest = form('unchecked', async (input: GuestFormData) => {
	const actor = requireActor();
	try {
		const { code, expiresAt } = await recordGuestWork(db, actor, input);
		const url = `${getRequestEvent().url.origin}/einloesen/${code}`;
		const qr = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
		return { code, expiresAt, url, qr, hoursTenths: Math.round(Number(input.hours.replace(',', '.')) * 10) };
	} catch (e) {
		toFormIssues(e);
	}
});