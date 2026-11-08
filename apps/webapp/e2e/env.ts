/**
 * Environment of the app under test. Passed to the build and preview
 * server by playwright.config.ts; process variables beat the repo's
 * .env, so your dev settings stay untouched.
 *
 * The database is separate from the dev one and is recreated on every
 * run. Override with E2E_DATABASE_URL (the name must contain "e2e" or
 * "test", see recreateDatabase).
 */
export const PORT = 4173;

export const TEST_ENV = {
	DATABASE_URL:
		process.env.E2E_DATABASE_URL ?? 'postgres://commonsdb:commonsdb@localhost:5432/commonsdb_e2e',
	ORIGIN: `http://localhost:${PORT}`,
	BETTER_AUTH_SECRET: 'e2e-only-secret-not-for-production-use',
	AUTH_EMAIL_PASSWORD: 'true',
	// empty = Keycloak off, even if the dev .env configures it
	KEYCLOAK_ISSUER: '',
	KEYCLOAK_CLIENT_ID: '',
	KEYCLOAK_CLIENT_SECRET: ''
};
