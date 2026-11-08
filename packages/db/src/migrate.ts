import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type { Db } from './client.ts';

export const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url));

/**
 * Apply pending migrations from code, using the same journal as
 * `drizzle-kit migrate`. For e2e setup now; later for deploys and the worker.
 */
export const runMigrations = (db: Db) => migrate(db, { migrationsFolder: MIGRATIONS_DIR });
