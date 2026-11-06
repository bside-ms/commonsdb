import type {BetterAuthPlugin} from 'better-auth';
import {betterAuth} from 'better-auth/minimal';
import {drizzleAdapter} from 'better-auth/adapters/drizzle';
import {genericOAuth, keycloak} from 'better-auth/plugins/generic-oauth';
import type {Db} from '@commonsdb/db';

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
    /** framework-specific plugins, appended last */
    plugins?: BetterAuthPlugin[];
};

export function createAuth(options: AuthOptions) {
    const {db, keycloak: kc} = options;

    return betterAuth({
        baseURL: options.baseURL,
        secret: options.secret,
        database: drizzleAdapter(db, {provider: 'pg'}),
        emailAndPassword: {enabled: options.emailPassword ?? false},
        account: {
            // same email via Keycloak and a local account → one user.
            accountLinking: {enabled: true, trustedProviders: ['keycloak']}
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
            }
        },
        plugins: [
            ...(kc ? [genericOAuth({config: [keycloak({...kc, pkce: true})]})] : []),
            ...(options.plugins ?? [])
        ]
    });
}

export type Auth = ReturnType<typeof createAuth>;

export type AuthSession = Auth['$Infer']['Session'];