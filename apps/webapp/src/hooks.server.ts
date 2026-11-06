import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { redirect } from '@sveltejs/kit';
import { sequence, type Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { ensureProfile, isAdmin, isOnboarded } from '@commonsdb/core';
import { auth, db } from '#lib/server/services.ts';

const handleAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
		event.locals.actor = { id: session.user.id, platformRole: session.user.platformRole };
		event.locals.profile = await ensureProfile(db, session.user);
	}
	// serves /api/auth/* itself, passes everything else on
	return svelteKitHandler({ event, resolve, auth, building });
};

const PUBLIC_PATHS = ['/login', '/api/auth'];
const ONBOARDING_PATHS = ['/onboarding', '/logout'];

const matches = (path: string, prefixes: string[]) =>
	prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/** guard: no session, no app. fine-grained rules live in core */
const guard: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const { actor, profile } = event.locals;

	if (matches(path, PUBLIC_PATHS)) return resolve(event);

	if (!actor || !profile) {
		redirect(303, `/login?redirectTo=${encodeURIComponent(path + event.url.search)}`);
	}
	if (!isOnboarded(profile) && !matches(path, ONBOARDING_PATHS)) {
		redirect(303, '/onboarding');
	}
	if (isOnboarded(profile) && path === '/onboarding') {
		redirect(303, '/');
	}
	if (matches(path, ['/admin']) && !isAdmin(actor)) {
		redirect(303, '/');
	}
	return resolve(event);
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) =>
		resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale))
			}
		)
	);

export const handle = sequence(handleParaglide, handleAuth, guard);
