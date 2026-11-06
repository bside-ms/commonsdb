import { redirect } from '@sveltejs/kit';
import { sequence, type Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '#lib/server/services.ts';

const handleAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}
	// serves /api/auth/* itself, passes everything else on
	return svelteKitHandler({ event, resolve, auth, building });
};

const PUBLIC_PATHS = ['/login', '/api/auth'];

/** guard: no session, no app. fine-grained rules live in core */
const guard: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

	if (!isPublic && !event.locals.user) {
		redirect(303, `/login?redirectTo=${encodeURIComponent(path + event.url.search)}`);
	}
	return resolve(event);
};

export const handle = sequence(handleAuth, guard);
