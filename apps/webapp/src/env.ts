import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => (value ? value : undefined);

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'Postgres connection string.' },
	ORIGIN: { description: 'App origin, e.g. `http://localhost:5173`.' },
	BETTER_AUTH_SECRET: { description: 'Signing secret, 32+ random characters.' },

	KEYCLOAK_ISSUER: {
		schema: optional,
		description: 'Issuer incl. realm, e.g. https://login.b-side.ms/auth/realms/bside.'
	},
	KEYCLOAK_CLIENT_ID: { schema: optional, description: 'OIDC client ID.' },
	KEYCLOAK_CLIENT_SECRET: { schema: optional, description: 'OIDC client secret.' },
	KEYCLOAK_ROLE_ADMIN: {
		schema: optional,
		description:
			'Keycloak client role that makes an admin, e.g. `commonsdb_admin`. Set it to let Keycloak decide admin vs. member at every login; unset = roles only in the app.'
	},

	UPLOAD_DIR: {
		description:
			'Where uploaded files are stored. Absolute on servers (a mounted volume); a relative path is resolved from the working directory.'
	},

	AUTH_EMAIL_PASSWORD: {
		schema: (value) => value === 'true',
		description: 'Set to `true` to allow email/password accounts.'
	}
});
