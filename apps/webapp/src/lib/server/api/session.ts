import type { Cookies } from '@sveltejs/kit';

/**
 * The token cookie.
 *
 * httpOnly so no script can read it, sameSite lax so a normal
 * top-level navigation still carries it, secure everywhere except
 * local development.
 *
 * This is the whole point of the BFF: the browser holds an opaque
 * cookie, the Node server holds the bearer token, and Laravel never
 * talks to the browser directly.
 */
export const SESSION_COOKIE = 'commonsdb_token';

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function setSessionCookie(cookies: Cookies, token: string): void {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !import.meta.env.DEV,
		maxAge: THIRTY_DAYS
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
