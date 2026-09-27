import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE } from '$api/session';

/**
 * Lifts the token out of the cookie and onto locals, where the api
 * wrapper picks it up.
 *
 * Deliberately does not fetch /me here: that would cost a round trip
 * on every request including static assets. The (app) layout loads
 * the user once per navigation instead.
 */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.accessToken = event.cookies.get(SESSION_COOKIE) ?? null;

	return resolve(event);
};
