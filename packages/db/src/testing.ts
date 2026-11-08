/**
 * Test helpers: a real Postgres (PGlite, in memory) with the real
 * migrations, plus small factories. For tests only. PGlite is a
 * devDependency, so nothing in src/ outside tests may import this file.
 *
 *   const t = await createTestDb();
 *   beforeEach(() => t.reset());
 *   after(() => t.close());
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import postgres from 'postgres';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Db } from './client.ts';
import * as schema from './schema/index.ts';

type PlatformRole = 'member' | 'admin' | 'superadmin';

const MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url));

/**
 * Drop and create a database on a real Postgres server (e2e tests).
 * Refuses any name without "test" or "e2e" in it, so a wrong
 * DATABASE_URL can never wipe a real database.
 */
export async function recreateDatabase(url: string) {
	const name = decodeURIComponent(new URL(url).pathname.slice(1));
	if (!/^[\w-]+$/.test(name) || !/test|e2e/.test(name)) {
		throw new Error(
			`Refusing to recreate "${name}": test databases need "test" or "e2e" in the name.`
		);
	}
	const maintenance = new URL(url);
	maintenance.pathname = '/postgres';
	const sql = postgres(maintenance.toString(), { max: 1, onnotice: () => {} });
	try {
		await sql.unsafe(`drop database if exists "${name}" with (force)`);
		await sql.unsafe(`create database "${name}"`);
	} finally {
		await sql.end();
	}
}

export async function createTestDb() {
	const pg = new PGlite();
	for (const file of readdirSync(MIGRATIONS)
		.filter((f) => f.endsWith('.sql'))
		.sort()) {
		const sql = readFileSync(`${MIGRATIONS}/${file}`, 'utf8');
		for (const statement of sql.split('--> statement-breakpoint')) {
			if (statement.trim()) await pg.exec(statement);
		}
	}
	// Same query API as the postgres-js client; only the driver differs.
	const db = drizzle(pg, { schema }) as unknown as Db;

	const tables = await pg.query<{ name: string }>(
		`select quote_ident(tablename) as name
		 from pg_tables
		 where schemaname = 'public'`
	);
	const all = tables.rows.map((r) => r.name).join(', ');

	return {
		db,
		pg,
		/** Empty every table; call in beforeEach. */
		reset: () => pg.exec(`truncate ${all} restart identity cascade`),
		close: () => pg.close()
	};
}

// ---- factories --------------------------------------------------------------

/** A user with an onboarded profile. Returns the actor core expects. */
export async function insertUser(
	db: Db,
	{ id, name = id, role = 'member' }: { id: string; name?: string; role?: PlatformRole }
) {
	await db.insert(schema.user).values({ id, name, email: `${id}@test.local`, platformRole: role });
	await db.insert(schema.profile).values({
		userId: id,
		displayName: name,
		onboardedAt: new Date(),
		rulesAcceptedAt: new Date()
	});
	return { id, platformRole: role };
}

/**
 * Categories from a { superCategory: [category, …] } map.
 * Returns ids by name: `cat.Garten`, `sup['Haus & Hof']`.
 */
export async function insertCategories(db: Db, taxonomy: Record<string, string[]>) {
	const cat: Record<string, string> = {};
	const sup: Record<string, string> = {};
	let sp = 0;
	for (const [superName, names] of Object.entries(taxonomy)) {
		const [s] = await db
			.insert(schema.superCategory)
			.values({ name: superName, position: sp++ })
			.returning({ id: schema.superCategory.id });
		sup[superName] = s.id;
		for (const [i, name] of names.entries()) {
			const [c] = await db
				.insert(schema.category)
				.values({ superCategoryId: s.id, name, position: i })
				.returning({ id: schema.category.id });
			cat[name] = c.id;
		}
	}
	return { cat, sup };
}
