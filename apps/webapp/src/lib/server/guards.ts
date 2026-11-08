import { error, invalid } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { DomainError, ValidationError, isAdmin, isSuperadmin, type Actor } from '@commonsdb/core';

/*
 * Helpers for remote functions (*.remote.ts).
 *
 * Remote functions are called at their own URL (/_app/remote/…), not at
 * the page's path. The /admin check in hooks.server.ts never sees them,
 * so every remote function has to say who may call it. These helpers are
 * that line, at the top of each function.
 */

/** The signed-in actor, or 401. */
export function requireActor(): Actor {
	const { locals } = getRequestEvent();
	if (!locals.actor) error(401, 'unauthenticated');
	return locals.actor;
}

/** Admin or superadmin, or 403. Category scope is checked in core. */
export function requireAdmin(): Actor {
	const actor = requireActor();
	if (!isAdmin(actor)) error(403, 'forbidden');
	return actor;
}

export function requireSuperadmin(): Actor {
	const actor = requireActor();
	if (!isSuperadmin(actor)) error(403, 'forbidden');
	return actor;
}

/**
 * For queries: core errors become HTTP errors (shown by +error.svelte).
 * Unknown errors are rethrown and end up as a 500.
 */
export function toHttpError(e: unknown): never {
	if (e instanceof ValidationError) error(400, e.code);
	if (e instanceof DomainError) {
		if (e.code === 'forbidden') error(403, e.code);
		if (e.code.endsWith('_not_found')) error(404, e.code);
		error(400, e.code);
	}
	throw e;
}

/**
 * For forms: core errors become form issues, so the form re-renders with
 * the user's input and a message per field. Codes stay codes; the page
 * translates them with errorMessage().
 *
 *   ValidationError { title: 'task_title_required' } → fields.title.issues()
 *   DomainError('shift_not_taken')                   → fields.issues() (form level)
 *   DomainError('task_not_found')                    → 404
 */
export function toFormIssues(e: unknown): never {
	if (e instanceof ValidationError) {
		invalid(
			...Object.entries(e.fields).map(([key, code]) => ({
				message: code,
				path: key === '_' ? [] : key.split('.')
			}))
		);
	}
	if (e instanceof DomainError) {
		if (e.code.endsWith('_not_found')) error(404, e.code);
		invalid(e.code);
	}
	throw e;
}
