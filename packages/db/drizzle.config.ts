import {defineConfig} from 'drizzle-kit';

process.loadEnvFile(new URL('../../.env', import.meta.url));

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
    schema: './src/schema/index.ts',
    out: './migrations',
    dialect: 'postgresql',
    dbCredentials: {url: process.env.DATABASE_URL},
    strict: true,
    verbose: true
});