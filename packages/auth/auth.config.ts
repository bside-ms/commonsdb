import {createDb} from '@commonsdb/db';
import {createAuth} from './src';

process.loadEnvFile(new URL('../../.env', import.meta.url));

const {db} = createDb(process.env.DATABASE_URL!);

// dummy values: the cli only needs to know which plugins are active
// so it can generate their tables. nothing here is used at runtime.
export const auth = createAuth({
    db,
    baseURL: 'http://localhost',
    secret: 'cli-only',
    keycloak: {issuer: 'http://localhost/realms/cli', clientId: 'cli'},
    emailPassword: true
});