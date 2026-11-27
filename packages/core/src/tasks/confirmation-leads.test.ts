import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { createTestDb, insertCategories, insertUser } from '@commonsdb/db/testing';
import type { Actor } from '../roles.ts';
import { getOwnBalance } from '../ledger/index.ts';
import { createAction, markTaskForAction } from '../actions/service.ts';
import { createTask, getTaskForAdmin, reportShift, setCapabilities, takeShift } from './service.ts';
import {
	confirmShift,
	listConfirmations,
	listConfirmationsForAction,
	sendBackShift
} from './confirmation.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

let superadmin: Actor, admin: Actor, kitchenAdmin: Actor, lead: Actor, kim: Actor;
let cat: Record<string, string>;

beforeEach(async () => {
	await t.reset();
	superadmin = await insertUser(db, { id: 'sa', role: 'superadmin' });
	admin = await insertUser(db, { id: 'ad', role: 'admin' });
	kitchenAdmin = await insertUser(db, { id: 'ka', role: 'admin' });
	lead = await insertUser(db, { id: 'lea', name: 'Lea' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
	({ cat } = await insertCategories(db, { 'Haus & Hof': ['Garten'], Küche: ['Kochen'] }));
	await setCapabilities(db, superadmin, admin.id, [cat.Garten]);
	await setCapabilities(db, superadmin, kitchenAdmin.id, [cat.Kochen]);
});

const day = (offset: number) => {
	const d = new Date();
	d.setDate(d.getDate() + offset);
	return d.toLocaleDateString('sv');
};

/** An Aktion today with Lea as lead; a garden task in it; `who` took and reported it. */
async function reported(who: Actor, { title = 'Hecke schneiden', leadIds = [lead.id] } = {}) {
	const actionId = await createAction(db, admin, {
		title: 'Repro-Arbeitstag',
		date: day(0),
		published: 'on',
		leadIds
	});
	const taskId = await createTask(db, admin, {
		title,
		categoryId: cat.Garten,
		whenKind: 'date',
		startsOn: day(0),
		shifts: [{ hours: '2' }]
	});
	await markTaskForAction(db, admin, taskId, actionId);
	const [s] = (await getTaskForAdmin(db, admin, taskId)).shifts;
	await takeShift(db, who, s.id);
	await reportShift(db, who, s.id, { note: 'Grünschnitt liegt am Tor' });
	return { actionId, taskId, shiftId: s.id };
}

test('a lead confirms a member’s shift in the window, with the hours they enter', async () => {
	const { shiftId } = await reported(kim);
	await confirmShift(db, lead, shiftId, { hours: '3' }, { today: day(0) });
	assert.equal(await getOwnBalance(db, kim), 30);
});

test('outside the window the lead may not', async () => {
	const { shiftId } = await reported(kim);
	await assert.rejects(confirmShift(db, lead, shiftId, { hours: '2' }, { today: day(-1) }), {
		code: 'forbidden'
	});
	await assert.rejects(confirmShift(db, lead, shiftId, { hours: '2' }, { today: day(8) }), {
		code: 'forbidden'
	});
	await confirmShift(db, lead, shiftId, { hours: '2' }, { today: day(7) });
});

test('a lead can send back', async () => {
	const { taskId, shiftId } = await reported(kim);
	await sendBackShift(db, lead, shiftId, { note: 'Bitte noch fegen' }, { today: day(0) });
	const [s] = (await getTaskForAdmin(db, admin, taskId)).shifts;
	assert.equal(s.status, 'taken');
});

test('own shift: the lead may not; it waits for the area admin', async () => {
	const { actionId, shiftId } = await reported(lead, { title: 'Arbeitstag organisieren' });
	await assert.rejects(confirmShift(db, lead, shiftId, { hours: '6' }, { today: day(0) }), {
		code: 'shift_confirm_own'
	});

	const [mine] = await listConfirmationsForAction(db, lead, actionId, { today: day(0) });
	assert.equal(mine.own, true);
	assert.equal(mine.canConfirm, false);

	const queue = await listConfirmations(db, admin);
	assert.deepEqual(
		queue.map((i) => i.task.title),
		['Arbeitstag organisieren']
	);
	await confirmShift(db, admin, shiftId, { hours: '6' });
	assert.equal(await getOwnBalance(db, lead), 60);
});

test('a lead of another Aktion, or a plain member, may not', async () => {
	const { shiftId } = await reported(kim, { leadIds: [] });
	await assert.rejects(confirmShift(db, lead, shiftId, { hours: '2' }, { today: day(0) }), {
		code: 'forbidden'
	});
});

test('the Aktion list: leads see all with notes; others by category or nothing', async () => {
	const { actionId } = await reported(kim);

	const [item] = await listConfirmationsForAction(db, lead, actionId, { today: day(0) });
	assert.equal(item.reportNote, 'Grünschnitt liegt am Tor');
	assert.equal(item.canConfirm, true);

	assert.equal((await listConfirmationsForAction(db, admin, actionId)).length, 1);
	assert.equal((await listConfirmationsForAction(db, kitchenAdmin, actionId)).length, 0);
	assert.equal((await listConfirmationsForAction(db, kim, actionId)).length, 0);
	assert.equal((await listConfirmationsForAction(db, lead, actionId, { today: day(8) })).length, 0);
});
