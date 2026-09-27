import { command, getRequestEvent } from '$app/server';
import * as v from 'valibot';
import { api, sdk } from '$api/client';
import { ApiError } from '$api/errors';
import { clearSessionCookie, setSessionCookie } from '$api/session';

/**
 * Auth commands.
 *
 * These return a result object rather than throwing, because a wrong
 * password is an expected outcome the form has to render — not an
 * error page. Unexpected failures still throw.
 */

export type AuthResult =
	{ ok: true } | { ok: false; message: string; fields: Record<string, string> };

function asResult(error: unknown): AuthResult {
	if (error instanceof ApiError) {
		return { ok: false, message: error.message, fields: error.fields };
	}
	throw error;
}

const signInSchema = v.object({
	email: v.pipe(v.string(), v.email('Bitte gib eine gültige E-Mail-Adresse ein.')),
	password: v.pipe(v.string(), v.minLength(1, 'Bitte gib dein Passwort ein.'))
});

export const signIn = command(signInSchema, async (body): Promise<AuthResult> => {
	try {
		const result = await api(sdk.signIn, { body: { ...body, deviceName: 'web' } });
		setSessionCookie(getRequestEvent().cookies, result.token);
		return { ok: true };
	} catch (error) {
		return asResult(error);
	}
});

const registerSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1, 'Bitte gib deinen Namen ein.')),
	email: v.pipe(v.string(), v.email('Bitte gib eine gültige E-Mail-Adresse ein.')),
	password: v.string(),
	passwordConfirmation: v.string(),
	pronoun: v.optional(v.string()),
	phone: v.optional(v.string()),
	accessibilityNote: v.optional(v.string()),
	acceptsRules: v.literal(true, 'Bitte bestätige die Hausregeln, um mitzumachen.')
});

export const register = command(registerSchema, async (body): Promise<AuthResult> => {
	try {
		const result = await api(sdk.register, { body });
		setSessionCookie(getRequestEvent().cookies, result.token);
		return { ok: true };
	} catch (error) {
		return asResult(error);
	}
});

export const signOut = command(async (): Promise<void> => {
	const { cookies } = getRequestEvent();

	try {
		await api(sdk.signOut);
	} catch {
		// If the token was already invalid server-side the cookie still
		// has to go, otherwise the person is stuck signed in to a
		// session that doesn't exist.
	}

	clearSessionCookie(cookies);
});
