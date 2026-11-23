import {
	DATABASE_URL,
	ORIGIN,
	BETTER_AUTH_SECRET,
	KEYCLOAK_ISSUER,
	KEYCLOAK_CLIENT_ID,
	KEYCLOAK_CLIENT_SECRET,
	AUTH_EMAIL_PASSWORD,
	UPLOAD_DIR
} from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { resolve } from 'node:path';
import { createDb } from '@commonsdb/db';
import { createDiskStorage } from '@commonsdb/media';
import { createAuth } from '@commonsdb/auth';
import { provisionProfile } from '@commonsdb/core';

export const { db } = createDb(DATABASE_URL);

/** Uploaded files (FileStorage port). Local disk; an S3 adapter can replace it per deployment. */
export const storage = createDiskStorage(resolve(UPLOAD_DIR));

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
	onUserCreated: (user) => provisionProfile(db, user),
	plugins: [sveltekitCookies(getRequestEvent)]
});
