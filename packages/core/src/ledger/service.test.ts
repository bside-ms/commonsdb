import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { ledgerEntry } from '@commonsdb/db/schema';
import { createTestDb, insertCategories, insertUser } from '@commonsdb/db/testing';
import type { Actor } from '../roles.ts';
import { createTask, getTaskForAdmin } from '../tasks/service.ts';
import { creditShift, ensureUserAccount } from './internal.ts';
import { getOwnAccount, getOwnBalance } from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

let sa: Actor, kim: Actor, lu: Actor, shiftId: string;

beforeEach(async () => {
	await t.reset();
	sa = await insertUser(db, { id: 'sa', role: 'superadmin' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
	lu = await insertUser(db, { id: 'lu', name: 'Lu' });
	const { cat } = await insertCategories(db, { 'Haus & Hof': ['Garten'] });
	const taskId = await createTask(db, sa, {
		title: 'Hecke schneiden',
		categoryId: cat.Garten,
		whenKind: 'date',
		startsOn: '2026-11-20',
		shifts: [{ hours: '1,5' }]
	});
	shiftId = (await getTaskForAdmin(db, sa, taskId)).shifts[0].id;
});

const credit = (userId = kim.id, amountTenths = 15) =>
	creditShift(db, { shiftId, userId, amountTenths, actorId: sa.id });

test('no account yet: balance 0, no entries', async () => {
	assert.deepEqual(await getOwnAccount(db, kim), { balanceTenths: 0, entries: [] });
	assert.equal(await getOwnBalance(db, kim), 0);
});

test('ensureUserAccount is idempotent', async () => {
	assert.equal(await ensureUserAccount(db, kim.id), await ensureUserAccount(db, kim.id));
});

test('a credit shows in balance and entries, with its task', async () => {
	await credit();
	const own = await getOwnAccount(db, kim);
	assert.equal(own.balanceTenths, 15);
	assert.equal(own.entries.length, 1);
	assert.equal(own.entries[0].kind, 'shift_credit');
	assert.equal(own.entries[0].task?.title, 'Hecke schneiden');
});

test('others only see their own account', async () => {
	await credit();
	assert.deepEqual(await getOwnAccount(db, lu), { balanceTenths: 0, entries: [] });
});

test('a shift is credited at most once', async () => {
	await credit();
	await assert.rejects(credit());
});

test('entries are append-only', async () => {
	await credit();
	await assert.rejects(db.update(ledgerEntry).set({ amountTenths: 100 }));
	await assert.rejects(db.delete(ledgerEntry).where(eq(ledgerEntry.shiftId, shiftId)));
});
