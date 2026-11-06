import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';
import { auth, loginMethods, keycloakOrigin } from '#lib/server/services.ts';

/** Error codes the login page knows how to display. */
export type LoginError = 'method_disabled' | 'start_failed' | 'invalid_credentials';

/** only same-site relative targets, no open redirect */
const safe = (t: string | null) => (t?.startsWith('/') && !t.startsWith('//') ? t : '/');

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, safe(url.searchParams.get('redirectTo')));
	return { loginMethods };
};

export const actions: Actions = {
	keycloak: async ({ url }) => {
		if (!loginMethods.keycloak) return fail(404, { code: 'method_disabled' as LoginError });
		const { url: target } = await auth.api.signInSocial({
			body: {
				provider: 'keycloak',
				callbackURL: safe(url.searchParams.get('redirectTo')),
				errorCallbackURL: '/login?error=oauth'
			}
		});
		if (!target) return fail(500, { code: 'start_failed' as LoginError });
		redirect(303, target, { external: keycloakOrigin ? [keycloakOrigin] : [] });
	},

	signIn: async ({ request, url }) => {
		if (!loginMethods.emailPassword) return fail(404, { code: 'method_disabled' as LoginError });
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		try {
			await auth.api.signInEmail({ body: { email, password: String(form.get('password') ?? '') } });
		} catch (e) {
			if (e instanceof APIError)
				return fail(400, { email, code: 'invalid_credentials' as LoginError });
			throw e;
		}
		redirect(303, safe(url.searchParams.get('redirectTo')));
	}
};
