import type { BetterAuthPlugin } from 'better-auth';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { genericOAuth, keycloak } from 'better-auth/plugins/generic-oauth';
import type { Db } from '@commonsdb/db';
import { keycloakClientRoles } from './keycloak.ts';

export { keycloakClientRoles };

export type KeycloakOptions = {
	/** Issuer incl. realm, e.g. https://login.b-side.ms/realms/Test */
	issuer: string;
	clientId: string;
	clientSecret?: string;
};

export type CreatedUser = { id: string; name: string; email: string };

export type AuthOptions = {
	db: Db;
	baseURL: string;
	secret: string;
	/** omit to disable keycloak login */
	keycloak?: KeycloakOptions;
	/** local email/password accounts */
	emailPassword?: boolean;
	onUserCreated?: (user: CreatedUser) => Promise<void>;
	/**
	 * After every Keycloak login (first and repeat), with the client roles
	 * from the fresh access token. Not called if the token can't be read.
	 */
	onKeycloakLogin?: (login: { userId: string; clientRoles: string[] }) => Promise<void>;
	/** framework-specific plugins, appended last */
	plugins?: BetterAuthPlugin[];
};

export function createAuth(options: AuthOptions) {
	const { db, keycloak: kc } = options;

	type AccountRow = { providerId?: string; userId?: string; accessToken?: string | null };
	const afterKeycloakTokens = async (a: AccountRow) => {
		if (!kc || !options.onKeycloakLogin) return;
		if (a.providerId !== 'keycloak' || !a.userId || !a.accessToken) return;
		const clientRoles = keycloakClientRoles(a.accessToken, kc.clientId);
		if (clientRoles) await options.onKeycloakLogin({ userId: a.userId, clientRoles });
	};

	return betterAuth({
		baseURL: options.baseURL,
		secret: options.secret,
		database: drizzleAdapter(db, { provider: 'pg' }),
		emailAndPassword: { enabled: options.emailPassword ?? false },
		account: {
			// same email via Keycloak and a local account → one user.
			accountLinking: { enabled: true, trustedProviders: ['keycloak'] }
		},
		user: {
			additionalFields: {
				platformRole: {
					type: ['member', 'admin', 'superadmin'],
					defaultValue: 'member',
					required: true,
					input: false
				}
			}
		},
		databaseHooks: {
			user: {
				create: {
					after: async (user) => {
						await options.onUserCreated?.(user);
					}
				}
			},
			// Better Auth writes fresh tokens to the account on every sign-in
			// (updateAccountOnSignIn, default on), first sign-in creates it.
			account: {
				create: { after: afterKeycloakTokens },
				update: { after: afterKeycloakTokens }
			}
		},
		plugins: [
			...(kc ? [genericOAuth({ config: [keycloak({ ...kc, pkce: true })] })] : []),
			...(options.plugins ?? [])
		]
	});
}

export type Auth = ReturnType<typeof createAuth>;

export type AuthSession = Auth['$Infer']['Session'];
