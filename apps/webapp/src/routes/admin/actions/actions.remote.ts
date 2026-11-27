import { error, redirect } from '@sveltejs/kit';
import { form, query } from '$app/server';
import * as v from 'valibot';
import {
	createAction,
	deleteAction,
	getAction,
	listActionsForAdmin,
	listLeadChoices,
	listTasksForAdmin,
	listTasksForAction,
	markTaskForAction,
	updateAction
} from '@commonsdb/core';
import { toHtml } from '@commonsdb/richtext';
import { db } from '#lib/server/services.ts';
import { requireAdmin, toFormIssues, toHttpError } from '#lib/server/guards.ts';

const Id = v.pipe(v.string(), v.uuid());

export const adminActions = query(async () =>
	listActionsForAdmin(db, requireAdmin()).catch(toHttpError)
);

export const leadChoices = query(async () =>
	listLeadChoices(db, requireAdmin()).catch(toHttpError)
);

export const adminAction = query(Id, async (id) => {
	const actor = requireAdmin();
	const item = await getAction(db, actor, id).catch(toHttpError);
	return {
		...item,
		html: item.description ? toHtml('description', item.description) : '',
		tasks: await listTasksForAction(db, actor, id)
	};
});

/** The admin's live tasks to mark, optionally searched; not those already in this Aktion. */
export const markableTasks = query(
	v.object({ actionId: Id, q: v.optional(v.string(), '') }),
	async ({ actionId, q }) => {
		const tasks = await listTasksForAdmin(db, requireAdmin(), { q }).catch(toHttpError);
		return tasks.filter((t) => t.actionId !== actionId).slice(0, 30);
	}
);

export type ActionFormData = {
	id?: string;
	title: string;
	description?: string;
	date: string;
	startsTime?: string;
	endsTime?: string;
	place?: string;
	published?: boolean;
	leadIds?: string[];
};

export const saveAction = form('unchecked', async ({ id, ...input }: ActionFormData) => {
	const actor = requireAdmin();
	if (id !== undefined && !v.is(Id, id)) error(400, 'action_not_found');
	let target = id;
	try {
		if (id) await updateAction(db, actor, id, input);
		else target = await createAction(db, actor, input);
	} catch (e) {
		toFormIssues(e);
	}
	redirect(303, `/admin/actions/${target}`);
});

export const removeAction = form(v.object({ id: Id }), async ({ id }) => {
	await deleteAction(db, requireAdmin(), id).catch(toFormIssues);
	redirect(303, '/admin/actions');
});

/** Mark (actionId set) or unmark (actionId '') one task. */
export const markTask = form(
	v.object({ taskId: Id, actionId: v.union([Id, v.literal('')]) }),
	async ({ taskId, actionId }) => {
		await markTaskForAction(db, requireAdmin(), taskId, actionId || null).catch(toFormIssues);
	}
);
