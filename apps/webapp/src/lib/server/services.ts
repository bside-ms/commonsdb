import {
	DATABASE_URL,
	ORIGIN,
	BETTER_AUTH_SECRET,
	KEYCLOAK_ISSUER,
	KEYCLOAK_CLIENT_ID,
	KEYCLOAK_CLIENT_SECRET,
	AUTH_EMAIL_PASSWORD
} from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { createDb } from '@commonsdb/db';
import { createAuth } from '@commonsdb/auth';

export const { db } = createDb(DATABASE_URL);

export const loginMethods = {
	keycloak: Boolean(KEYCLOAK_ISSUER && KEYCLOAK_CLIENT_ID),
	emailPassword: AUTH_EMAIL_PASSWORD
} as const;

export const keycloakOrigin = KEYCLOAK_ISSUER ? new URL(KEYCLOAK_ISSUER).origin : undefined;

export const auth = createAuth({
	db,
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	keycloak: loginMethods.keycloak
		? {
				issuer: KEYCLOAK_ISSUER!,
				clientId: KEYCLOAK_CLIENT_ID!,
				clientSecret: KEYCLOAK_CLIENT_SECRET
			}
		: undefined,
	emailPassword: loginMethods.emailPassword,
	plugins: [sveltekitCookies(getRequestEvent)]
});
