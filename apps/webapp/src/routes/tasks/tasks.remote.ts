/*
 * The member side of tasks: browse, read, take, give back.
 * Any signed-in member may call these; what they see is decided in core
 * (open tasks plus their own).
 */
import { form, query } from '$app/server';
import * as v from 'valibot';
import {
	getTaskForMember,
	listCategories,
	listTasksForMember,
	releaseShift,
	takeShift
} from '@commonsdb/core';
import { toHtml } from '@commonsdb/richtext';
import { db } from '#lib/server/services.ts';
import { requireActor, toFormIssues, toHttpError } from '#lib/server/guards.ts';

const Id = v.pipe(v.string(), v.uuid());
/** Ids straight from the URL: anything that isn't a uuid means "no filter". */
const idOrNothing = (x: string | undefined) => (v.is(Id, x) ? x : undefined);

export const taskCategories = query(async () => {
	requireActor();
	return listCategories(db);
});

export const memberTasks = query(
	v.object({
		q: v.optional(v.string()),
		superCategoryId: v.optional(v.string()),
		categoryId: v.optional(v.string())
	}),
	async ({ q, superCategoryId, categoryId }) =>
		listTasksForMember(db, requireActor(), {
			q,
			superCategoryId: idOrNothing(superCategoryId),
			categoryId: idOrNothing(categoryId)
		}).catch(toHttpError)
);

/** Only the tasks the member has taken (start page). */
export const myTasks = query(async () => {
	const tasks = await listTasksForMember(db, requireActor()).catch(toHttpError);
	return tasks.filter((t) => t.shift.mine);
});

export const memberTask = query(Id, async (id) => {
	const task = await getTaskForMember(db, requireActor(), id).catch(toHttpError);
	return { ...task, descriptionHtml: toHtml('description', task.description) };
});

const ByShift = v.object({ shiftId: Id });

export const take = form(ByShift, async ({ shiftId }) => {
	await takeShift(db, requireActor(), shiftId).catch(toFormIssues);
	return { done: true };
});

export const release = form(ByShift, async ({ shiftId }) => {
	await releaseShift(db, requireActor(), shiftId).catch(toFormIssues);
	return { done: true };
});
