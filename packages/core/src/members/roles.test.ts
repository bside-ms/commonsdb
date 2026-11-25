import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { createTestDb, insertUser } from '@commonsdb/db/testing';
import { user } from '@commonsdb/db/schema';
import { ValidationError } from '../errors.ts';
import type { Actor } from '../roles.ts';
import { setPlatformRole } from './roles.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

let sam: Actor, ada: Actor, kim: Actor;

beforeEach(async () => {
	await t.reset();
	sam = await insertUser(db, { id: 'sam', role: 'superadmin' });
	ada = await insertUser(db, { id: 'ada', role: 'admin' });
	kim = await insertUser(db, { id: 'kim' });
});

const roleOf = async (id: string) =>
	(await db.query.user.findFirst({ where: eq(user.id, id), columns: { platformRole: true } }))
		?.platformRole;

test('superadmins set any role, also superadmin', async () => {
	await setPlatformRole(db, sam, 'kim', { role: 'admin' });
	assert.equal(await roleOf('kim'), 'admin');
	await setPlatformRole(db, sam, 'ada', { role: 'superadmin' });
	assert.equal(await roleOf('ada'), 'superadmin');
	await setPlatformRole(db, sam, 'kim', { role: 'member' });
	assert.equal(await roleOf('kim'), 'member');
});

test('only superadmins; unknown users and roles are refused', async () => {
	await assert.rejects(setPlatformRole(db, ada, 'kim', { role: 'admin' }), { code: 'forbidden' });
	await assert.rejects(setPlatformRole(db, kim, 'kim', { role: 'superadmin' }), {
		code: 'forbidden'
	});
	await assert.rejects(setPlatformRole(db, sam, 'nobody', { role: 'admin' }), {
		code: 'user_not_found'
	});
	await assert.rejects(
		setPlatformRole(db, sam, 'kim', { role: 'owner' }),
		(e) => e instanceof ValidationError && e.fields.role === 'role_invalid'
	);
});

test('the last superadmin stays, also when demoting herself', async () => {
	await assert.rejects(setPlatformRole(db, sam, 'sam', { role: 'admin' }), {
		code: 'last_superadmin'
	});
	assert.equal(await roleOf('sam'), 'superadmin');

	// with a second one, stepping down is fine
	await setPlatformRole(db, sam, 'ada', { role: 'superadmin' });
	await setPlatformRole(db, sam, 'sam', { role: 'member' });
	assert.equal(await roleOf('sam'), 'member');
	// ada's session now says superadmin
	const adaNow: Actor = { id: 'ada', platformRole: 'superadmin' };
	await assert.rejects(setPlatformRole(db, adaNow, 'ada', { role: 'member' }), {
		code: 'last_superadmin'
	});
});

test('two superadmins demoting each other at once: one stays', async () => {
	await setPlatformRole(db, sam, 'ada', { role: 'superadmin' });
	const adaNow: Actor = { id: 'ada', platformRole: 'superadmin' };
	const results = await Promise.allSettled([
		setPlatformRole(db, sam, 'ada', { role: 'member' }),
		setPlatformRole(db, adaNow, 'sam', { role: 'member' })
	]);
	assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
	const left = await db.select().from(user).where(eq(user.platformRole, 'superadmin'));
	assert.equal(left.length, 1);
});

test('setting the same role again is a no-op', async () => {
	assert.equal(await setPlatformRole(db, sam, 'sam', { role: 'superadmin' }), 'superadmin');
});
