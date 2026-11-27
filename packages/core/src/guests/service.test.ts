import assert from 'node:assert/strict';
import { after, beforeEach, describe, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { createTestDb, insertCategories, insertUser } from '@commonsdb/db/testing';
import { ledgerEntry, shiftClaim } from '@commonsdb/db/schema';
import type { Actor } from '../roles.ts';
import { getOwnBalance } from '../ledger/index.ts';
import { createAction, markTaskForAction } from '../actions/service.ts';
import {
	createTask,
	getTaskForAdmin,
	listTasksForAction,
	setCapabilities,
	takeShift
} from '../tasks/service.ts';
import {
	assignGuestClaim,
	canRecordGuestsForAction,
	listGuestClaimsForAdmin,
	recordGuestWork,
	redeemGuestCode,
	reissueGuestCode
} from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

// ---- fixtures ---------------------------------------------------------------

let superadmin: Actor, admin: Actor, kitchenAdmin: Actor, lead: Actor, kim: Actor, lu: Actor;
let cat: Record<string, string>;

beforeEach(async () => {
	await t.reset();
	superadmin = await insertUser(db, { id: 'sa', role: 'superadmin' });
	admin = await insertUser(db, { id: 'ad', name: 'Alex', role: 'admin' });
	kitchenAdmin = await insertUser(db, { id: 'ka', role: 'admin' });
	lead = await insertUser(db, { id: 'lea', name: 'Lea' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
	lu = await insertUser(db, { id: 'lu', name: 'Lu' });
	({ cat } = await insertCategories(db, { 'Haus & Hof': ['Garten'], Küche: ['Kochen'] }));
	await setCapabilities(db, superadmin, admin.id, [cat.Garten]);
	await setCapabilities(db, superadmin, kitchenAdmin.id, [cat.Kochen]);
});

const day = (offset: number) => {
	const d = new Date();
	d.setDate(d.getDate() + offset);
	return d.toLocaleDateString('sv');
};

/** An Aktion on `date` with Lea as lead and one marked garden task. */
async function setup({ date = day(0), shifts = [{ hours: '2' }] } = {}) {
	const actionId = await createAction(db, admin, {
		title: 'Repro-Arbeitstag',
		date,
		published: 'on',
		leadIds: [lead.id]
	});
	const taskId = await createTask(db, admin, {
		title: 'Hecke schneiden',
		categoryId: cat.Garten,
		whenKind: 'date',
		startsOn: date,
		shifts
	});
	await markTaskForAction(db, admin, taskId, actionId);
	return { actionId, taskId };
}

const credits = async () => db.select().from(ledgerEntry);

// ---- recording --------------------------------------------------------------

describe('recordGuestWork', () => {
	test('takes the free shift, confirmed without assignee, no ledger entry yet', async () => {
		const { actionId, taskId } = await setup();
		const { code, expiresAt } = await recordGuestWork(db, admin, {
			taskId,
			hours: '1,5',
			guestName: 'Mo'
		});
		assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
		assert.ok(expiresAt > new Date(Date.now() + 80 * 24 * 3600 * 1000));

		const [s] = (await getTaskForAdmin(db, admin, taskId)).shifts;
		assert.equal(s.status, 'confirmed');
		assert.equal(s.hoursTenths, 15);
		assert.equal(s.assigneeName, 'Mo');
		assert.equal(s.guest, true);
		assert.deepEqual(await credits(), []);

		const [item] = await listTasksForAction(db, kim, actionId);
		assert.deepEqual(item.people, [{ name: 'Mo', guest: true }]);
		assert.equal(item.done, true);
	});

	test('no free shift: adds one', async () => {
		const { taskId } = await setup();
		const [first] = (await getTaskForAdmin(db, admin, taskId)).shifts;
		await takeShift(db, kim, first.id);
		await recordGuestWork(db, admin, { taskId, hours: '1' });
		const shifts = (await getTaskForAdmin(db, admin, taskId)).shifts;
		assert.equal(shifts.length, 2);
		assert.equal(shifts.filter((s) => s.guest).length, 1);
	});

	test('the code is stored hashed', async () => {
		const { taskId } = await setup();
		const { code } = await recordGuestWork(db, admin, { taskId, hours: '1' });
		const [row] = await db.select().from(shiftClaim);
		assert.notEqual(row.codeHash, code);
		assert.equal(row.codeHash.length, 64);
	});
});

describe('who may record', () => {
	test('admin of the category yes, of another category no, plain member no', async () => {
		const { taskId } = await setup();
		await assert.rejects(recordGuestWork(db, kitchenAdmin, { taskId, hours: '1' }), {
			code: 'forbidden'
		});
		await assert.rejects(recordGuestWork(db, kim, { taskId, hours: '1' }), { code: 'forbidden' });
	});

	test('a lead from the day until 7 days after', async () => {
		const { actionId, taskId } = await setup({ date: day(0) });
		await recordGuestWork(db, lead, { taskId, hours: '1' }, { today: day(0) });
		await recordGuestWork(db, lead, { taskId, hours: '1' }, { today: day(7) });
		await assert.rejects(recordGuestWork(db, lead, { taskId, hours: '1' }, { today: day(-1) }), {
			code: 'forbidden'
		});
		await assert.rejects(recordGuestWork(db, lead, { taskId, hours: '1' }, { today: day(8) }), {
			code: 'forbidden'
		});
		assert.equal(await canRecordGuestsForAction(db, lead, actionId, { today: day(0) }), true);
		assert.equal(await canRecordGuestsForAction(db, lead, actionId, { today: day(8) }), false);
		assert.equal(await canRecordGuestsForAction(db, kim, actionId, { today: day(0) }), false);
	});
});

// ---- redeeming --------------------------------------------------------------

describe('redeemGuestCode', () => {
	test('credits the member; case and dashes do not matter; only once', async () => {
		const { taskId } = await setup();
		const { code } = await recordGuestWork(db, admin, { taskId, hours: '2' });

		const res = await redeemGuestCode(db, kim, {
			code: ` ${code.toLowerCase().replace('-', ' ')} `
		});
		assert.equal(res.hoursTenths, 20);
		assert.equal(await getOwnBalance(db, kim), 20);

		const [s] = (await getTaskForAdmin(db, admin, taskId)).shifts;
		assert.equal(s.assigneeName, 'Kim');
		assert.equal(s.guest, false);

		const [entry] = await credits();
		assert.equal(entry.actorId, admin.id); // who confirmed on site

		await assert.rejects(redeemGuestCode(db, lu, { code }), { code: 'claim_used' });
	});

	test('unknown, empty and expired codes', async () => {
		const { taskId } = await setup();
		const { code } = await recordGuestWork(db, admin, { taskId, hours: '1' });
		await assert.rejects(redeemGuestCode(db, kim, { code: 'AAAA-AAAA' }), {
			code: 'claim_not_found'
		});
		await assert.rejects(redeemGuestCode(db, kim, { code: ' ' }));
		await db.update(shiftClaim).set({ expiresAt: new Date(Date.now() - 1000) });
		await assert.rejects(redeemGuestCode(db, kim, { code }), { code: 'claim_expired' });
	});

	test('a member who already has a shift on the task gets a clear error', async () => {
		const { taskId } = await setup({ shifts: [{ hours: '1' }, { hours: '1' }] });
		const [first] = (await getTaskForAdmin(db, admin, taskId)).shifts;
		await takeShift(db, kim, first.id);
		const { code } = await recordGuestWork(db, admin, { taskId, hours: '1' });
		await assert.rejects(redeemGuestCode(db, kim, { code }), { code: 'claim_already_on_task' });
		// nothing changed: still redeemable by someone else
		await redeemGuestCode(db, lu, { code });
		assert.equal(await getOwnBalance(db, lu), 10);
	});
});

// ---- admins -----------------------------------------------------------------

describe('admins', () => {
	test('assign by hand, also after expiry; needs the category', async () => {
		const { taskId } = await setup();
		await recordGuestWork(db, admin, { taskId, hours: '3' });
		await db.update(shiftClaim).set({ expiresAt: new Date(Date.now() - 1000) });

		const [claim] = await listGuestClaimsForAdmin(db, admin);
		assert.equal(claim.state, 'expired');
		await assert.rejects(assignGuestClaim(db, kitchenAdmin, claim.id, { userId: kim.id }), {
			code: 'forbidden'
		});
		await assignGuestClaim(db, admin, claim.id, { userId: kim.id });
		assert.equal(await getOwnBalance(db, kim), 30);

		const [after] = await listGuestClaimsForAdmin(db, admin);
		assert.equal(after.state, 'claimed');
		assert.equal(after.claimedBy, 'Kim');
		await assert.rejects(assignGuestClaim(db, admin, claim.id, { userId: lu.id }), {
			code: 'claim_used'
		});
	});

	test('reissue: the old code stops working, the new one does', async () => {
		const { taskId } = await setup();
		const { code: old } = await recordGuestWork(db, admin, { taskId, hours: '1' });
		const [claim] = await listGuestClaimsForAdmin(db, admin);
		const { code } = await reissueGuestCode(db, admin, claim.id);
		assert.notEqual(code, old);
		await assert.rejects(redeemGuestCode(db, kim, { code: old }), { code: 'claim_not_found' });
		await redeemGuestCode(db, kim, { code });
	});

	test('the list only shows the admin’s categories', async () => {
		const { taskId } = await setup();
		await recordGuestWork(db, admin, { taskId, hours: '1' });
		assert.equal((await listGuestClaimsForAdmin(db, admin)).length, 1);
		assert.equal((await listGuestClaimsForAdmin(db, kitchenAdmin)).length, 0);
		assert.equal((await listGuestClaimsForAdmin(db, superadmin)).length, 1);
	});
});
