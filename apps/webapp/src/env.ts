import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => (value ? value : undefined);

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'Postgres connection string.' },
	ORIGIN: { description: 'App origin, e.g. `http://localhost:5173`.' },
	BETTER_AUTH_SECRET: { description: 'Signing secret, 32+ random characters.' },

	KEYCLOAK_ISSUER: {
		schema: optional,
		description: 'Issuer incl. realm, e.g. `https://login.b-side.ms/realms/Test`.'
	},
	KEYCLOAK_CLIENT_ID: { schema: optional, description: 'OIDC client ID.' },
	KEYCLOAK_CLIENT_SECRET: { schema: optional, description: 'OIDC client secret.' },

	AUTH_EMAIL_PASSWORD: {
		schema: (value) => value === 'true',
		description: 'Set to `true` to allow email/password accounts.'
	}
});
