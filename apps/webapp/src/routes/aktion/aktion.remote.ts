/*
 * Aktionen for members: the day page and the teaser on Start / tasks.
 */
import { query } from '$app/server';
import * as v from 'valibot';
import { getAction, listTasksForAction, listUpcomingActions } from '@commonsdb/core';
import { toHtml } from '@commonsdb/richtext';
import { db } from '#lib/server/services.ts';
import { requireActor, toHttpError } from '#lib/server/guards.ts';

const Id = v.pipe(v.string(), v.uuid());

export const upcomingActions = query(async () => {
	requireActor();
	return listUpcomingActions(db);
});

export const actionPage = query(Id, async (id) => {
	const actor = requireActor();
	const item = await getAction(db, actor, id).catch(toHttpError);
	const tasks = await listTasksForAction(db, actor, id);
	return {
		...item,
		html: item.description ? toHtml('description', item.description) : null,
		tasks
	};
});
