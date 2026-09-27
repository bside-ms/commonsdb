import { query, command } from '$app/server';
import * as v from 'valibot';
import { api } from '$api/client';
import type { Task } from '../types';

/**
 * The BFF layer. These run on the server, read the Keycloak token from
 * the httpOnly cookie via the api client, and call Laravel. The browser
 * never sees a token and never learns Laravel's URL.
 *
 * Arguments cross an HTTP boundary, so they are validated.
 */

export const listTasks = query(
	v.object({
		categoryId: v.optional(v.string()),
		search: v.optional(v.string())
	}),
	async ({ categoryId, search }) =>
		api.get<Task[]>('/tasks', { query: { category: categoryId, q: search } })
);

export const getTask = query(v.string(), async (id) => api.get<Task>(`/tasks/${id}`));

export const claimShift = command(v.string(), async (shiftId) => {
	await api.post(`/shifts/${shiftId}/claim`);
	await listTasks({}).refresh();
});

export const releaseShift = command(v.string(), async (shiftId) => {
	await api.post(`/shifts/${shiftId}/release`);
	await listTasks({}).refresh();
});
