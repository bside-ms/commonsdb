import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { createTestDb, insertUser } from '@commonsdb/db/testing';
import { DomainError, ValidationError } from '../errors.ts';
import type { Actor } from '../roles.ts';
import { adjustBalance, listMemberBalances } from './admin.ts';
import { getOwnAccount } from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

let sa: Actor, admin: Actor, kim: Actor;

beforeEach(async () => {
	await t.reset();
	sa = await insertUser(db, { id: 'sa', name: 'Sam', role: 'superadmin' });
	admin = await insertUser(db, { id: 'ad', name: 'Alex', role: 'admin' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
});

async function codeOf(fn: () => Promise<unknown>) {
	try {
		await fn();
	} catch (e) {
		if (e instanceof ValidationError) return { code: e.code, fields: e.fields };
		if (e instanceof DomainError) return { code: e.code };
		throw e;
	}
	assert.fail('expected a DomainError');
}

test('lists everyone with their balance, by name', async () => {
	await adjustBalance(db, sa, kim.id, { amount: '2', memo: 'Arbeitstag' });
	await adjustBalance(db, sa, kim.id, { amount: '−0,5', memo: 'Korrektur' });

	const list = await listMemberBalances(db, sa);
	assert.deepEqual(
		list.map((m) => [m.name, m.balanceTenths]),
		[
			['Alex', 0],
			['Kim', 15],
			['Sam', 0]
		]
	);
});

test('the member sees the adjustment with its memo', async () => {
	await adjustBalance(db, sa, kim.id, { amount: '-1', memo: 'Doppelt gebucht' });
	const own = await getOwnAccount(db, kim);
	assert.equal(own.balanceTenths, -10);
	assert.equal(own.entries[0].kind, 'adjustment');
	assert.equal(own.entries[0].memo, 'Doppelt gebucht');
	assert.equal(own.entries[0].thanks, null);
});

test('superadmins only', async () => {
	assert.deepEqual(await codeOf(() => listMemberBalances(db, admin)), { code: 'forbidden' });
	assert.deepEqual(
		await codeOf(() => adjustBalance(db, admin, kim.id, { amount: '1', memo: 'x' })),
		{ code: 'forbidden' }
	);
});

test('amount and memo are validated', async () => {
	const zero = await codeOf(() => adjustBalance(db, sa, kim.id, { amount: '0', memo: 'x' }));
	assert.deepEqual(zero.fields, { amount: 'ledger_amount_zero' });
	const odd = await codeOf(() => adjustBalance(db, sa, kim.id, { amount: '0,3', memo: 'x' }));
	assert.deepEqual(odd.fields, { amount: 'ledger_amount_half_steps' });
	const noMemo = await codeOf(() => adjustBalance(db, sa, kim.id, { amount: '1', memo: ' ' }));
	assert.deepEqual(noMemo.fields, { memo: 'ledger_memo_required' });
});

test('unknown user', async () => {
	assert.deepEqual(
		await codeOf(() => adjustBalance(db, sa, 'nobody', { amount: '1', memo: 'x' })),
		{ code: 'user_not_found' }
	);
});
