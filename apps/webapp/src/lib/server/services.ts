import {
	DATABASE_URL,
	ORIGIN,
	BETTER_AUTH_SECRET,
	KEYCLOAK_ISSUER,
	KEYCLOAK_CLIENT_ID,
	KEYCLOAK_CLIENT_SECRET,
	KEYCLOAK_ROLE_ADMIN,
	AUTH_EMAIL_PASSWORD,
	UPLOAD_DIR
} from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { resolve } from 'node:path';
import { createDb } from '@commonsdb/db';
import { createDiskStorage } from '@commonsdb/media';
import { createAuth } from '@commonsdb/auth';
import { applyIdpRole, provisionProfile } from '@commonsdb/core';

export const { db } = createDb(DATABASE_URL);

/** Uploaded files (FileStorage port). Local disk; an S3 adapter can replace it per deployment. */
export const storage = createDiskStorage(resolve(UPLOAD_DIR));

export const loginMethods = {
	keycloak: Boolean(KEYCLOAK_ISSUER && KEYCLOAK_CLIENT_ID),
	emailPassword: AUTH_EMAIL_PASSWORD
} as const;

export const keycloakOrigin = KEYCLOAK_ISSUER ? new URL(KEYCLOAK_ISSUER).origin : undefined;

/** Keycloak decides admin vs. member (only with a configured admin role). */
export const rolesFromKeycloak = loginMethods.keycloak && Boolean(KEYCLOAK_ROLE_ADMIN);

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
	onKeycloakLogin: rolesFromKeycloak
		? async ({ userId, clientRoles }) => {
				await applyIdpRole(db, userId, { admin: clientRoles.includes(KEYCLOAK_ROLE_ADMIN!) });
			}
		: undefined,
	plugins: [sveltekitCookies(getRequestEvent)]
});
