/**
 * Runs once before all tests: a fresh database with the real migrations,
 * categories, and the users from users.ts, created through Better Auth
 * (so passwords are hashed the real way) and already onboarded.
 */
import { eq } from 'drizzle-orm';
import { createAuth } from '@commonsdb/auth';
import { provisionProfile, setCapabilities } from '@commonsdb/core';
import { createDb, runMigrations, schema } from '@commonsdb/db';
import { insertCategories, recreateDatabase } from '@commonsdb/db/testing';
import { TEST_ENV } from './env.ts';
import { ADMIN_CATEGORIES, PASSWORD, TAXONOMY, USERS } from './users.ts';

export default async function globalSetup() {
	await recreateDatabase(TEST_ENV.DATABASE_URL);
	const { db, close } = createDb(TEST_ENV.DATABASE_URL);

	try {
		await runMigrations(db);
		const { cat } = await insertCategories(db, TAXONOMY);

		const auth = createAuth({
			db,
			baseURL: TEST_ENV.ORIGIN,
			secret: TEST_ENV.BETTER_AUTH_SECRET,
			emailPassword: true,
			onUserCreated: (user) => provisionProfile(db, user)
		});

		const ids: Record<string, string> = {};
		for (const [key, u] of Object.entries(USERS)) {
			const { user } = await auth.api.signUpEmail({
				body: { name: u.name, email: u.email, password: PASSWORD }
			});
			ids[key] = user.id;
			await db.update(schema.user).set({ platformRole: u.role }).where(eq(schema.user.id, user.id));
			await db
				.update(schema.profile)
				.set({ onboardedAt: new Date(), rulesAcceptedAt: new Date() })
				.where(eq(schema.profile.userId, user.id));
		}

		await setCapabilities(
			db,
			{ id: ids.superadmin, platformRole: 'superadmin' },
			ids.admin,
			ADMIN_CATEGORIES.map((name) => cat[name])
		);
	} finally {
		await close();
	}
}
