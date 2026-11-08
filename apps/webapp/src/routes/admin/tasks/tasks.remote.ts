/*
 * Admin task management as remote functions.
 *
 * query → read, called with `await` in components; runs on the server
 *         during SSR, then over fetch when its arguments change.
 * form  → write, spread onto a <form>. Works without JS (plain POST);
 *         with JS it submits in place and refreshes the queries on the page.
 *
 * Every function starts with requireAdmin(): remote functions have their
 * own URLs, so the /admin guard in hooks.server.ts doesn't cover them.
 * Validation and category scope live in core; this file only translates.
 */
import { error, redirect } from '@sveltejs/kit';
import { form, query } from '$app/server';
import * as v from 'valibot';
import {
	createTask,
	deleteTask,
	duplicateTask,
	getTaskForAdmin,
	listManageableCategories,
	listTasksForAdmin,
	releaseShift,
	restoreTask,
	updateTask
} from '@commonsdb/core';
import { toHtml } from '@commonsdb/richtext';
import { db } from '#lib/server/services.ts';
import { requireAdmin, toFormIssues, toHttpError } from '#lib/server/guards.ts';

// ---- reads ----------------------------------------------------------------

const Id = v.pipe(v.string(), v.uuid());

/** Categories this admin may use (all of them for superadmins). */
export const manageableCategories = query(async () => listManageableCategories(db, requireAdmin()));

export const adminTasks = query(
	v.object({
		q: v.optional(v.string()),
		categoryId: v.optional(v.string()),
		deleted: v.optional(v.boolean())
	}),
	async ({ categoryId, ...filter }) => {
		const actor = requireAdmin();
		// straight from ?category=: anything that isn't a uuid means "all"
		const category = v.is(Id, categoryId) ? categoryId : undefined;
		return listTasksForAdmin(db, actor, { ...filter, categoryId: category }).catch(toHttpError);
	}
);

/** One task for the edit page, with its description pre-rendered. */
export const adminTask = query(Id, async (id) => {
	const task = await getTaskForAdmin(db, requireAdmin(), id).catch(toHttpError);
	return { ...task, descriptionHtml: toHtml('description', task.description) };
});

// ---- writes ---------------------------------------------------------------

/**
 * The fields the task form posts. 'unchecked' means: no schema here, the
 * type only shapes `fields.*` for the component. core's TaskInput is the
 * one place that validates (and turns "1,5" into 15 tenths).
 */
export type TaskFormData = {
	id?: string;
	title: string;
	categoryId: string;
	description?: string;
	urgent?: boolean;
	selfService?: boolean;
	place?: string;
	contact?: string;
	bring?: string;
	physicalDemands?: string;
	whenKind: 'date' | 'range';
	startsOn: string;
	endsOn?: string;
	hours: string;
};

/** Create (no id) or update (with id). Back to the list on success. */
export const saveTask = form('unchecked', async ({ id, ...input }: TaskFormData) => {
	const actor = requireAdmin();
	if (id !== undefined && !v.is(Id, id)) error(400, 'task_not_found');
	try {
		if (id) await updateTask(db, actor, id, input);
		else await createTask(db, actor, input);
	} catch (e) {
		toFormIssues(e);
	}
	redirect(303, '/admin/tasks');
});

/**
 * The small row actions only post an id, so they get a real schema: a
 * malformed id is rejected by SvelteKit before our code runs. Compare
 * saveTask, where core does the validating.
 */
const ById = v.object({ id: Id });

/** Copy, then open the copy: usually the date needs changing next. */
export const duplicate = form(ById, async ({ id }) => {
	const copyId = await duplicateTask(db, requireAdmin(), id).catch(toFormIssues);
	redirect(303, `/admin/tasks/${copyId}`);
});

export const remove = form(ById, async ({ id }) => {
	await deleteTask(db, requireAdmin(), id).catch(toFormIssues);
	return { done: true };
});

export const restore = form(ById, async ({ id }) => {
	await restoreTask(db, requireAdmin(), id).catch(toFormIssues);
	return { done: true };
});

/** Take the assignee off a task; it is open for everyone again. */
export const releaseAssignee = form(ById, async ({ id }) => {
	await releaseShift(db, requireAdmin(), id).catch(toFormIssues);
	return { done: true };
});
