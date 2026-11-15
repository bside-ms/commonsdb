import assert from 'node:assert/strict';
import { after, beforeEach, describe, test } from 'node:test';
import { createTestDb, insertCategories, insertUser } from '@commonsdb/db/testing';
import { DomainError, ValidationError } from '../errors.ts';
import { getOwnAccount } from '../ledger/service.ts';
import type { Actor } from '../roles.ts';
import { confirmShift, listConfirmations, sendBackShift } from './confirmation.ts';
import {
	createTask,
	deleteTask,
	getTaskForAdmin,
	getTaskForMember,
	reportShift,
	setCapabilities,
	takeShift,
	updateTask
} from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

let sa: Actor, admin: Actor, otherAdmin: Actor, kim: Actor;
let cat: Record<string, string>;

beforeEach(async () => {
	await t.reset();
	sa = await insertUser(db, { id: 'sa', role: 'superadmin' });
	admin = await insertUser(db, { id: 'ad', name: 'Alex', role: 'admin' });
	otherAdmin = await insertUser(db, { id: 'ad2', role: 'admin' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
	({ cat } = await insertCategories(db, { 'Haus & Hof': ['Garten'], Küche: ['Kochen'] }));
	await setCapabilities(db, sa, admin.id, [cat.Garten]);
});

const input = (over: Record<string, unknown> = {}) => ({
	title: 'Hecke schneiden',
	categoryId: cat.Garten,
	whenKind: 'date',
	startsOn: '2026-11-20',
	hours: '1,5',
	...over
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

/** A task in Garten, taken and reported by `who`. Returns task and shift id. */
async function reported(who: Actor = kim, over: Record<string, unknown> = {}) {
	const taskId = await createTask(db, sa, input(over));
	const shiftId = (await getTaskForAdmin(db, sa, taskId)).shift.id;
	await takeShift(db, who, shiftId);
	await reportShift(db, who, shiftId, { note: 'fertig' });
	return { taskId, shiftId };
}

describe('listConfirmations', () => {
	test('reported shifts in the admin’s categories, oldest first', async () => {
		const a = await reported();
		const b = await reported(kim, { title: 'Rasen mähen' });
		await reported(kim, { categoryId: cat.Kochen });

		const list = await listConfirmations(db, admin);
		assert.deepEqual(
			list.map((i) => i.shiftId),
			[a.shiftId, b.shiftId]
		);
		assert.equal(list[0].assigneeName, 'Kim');
		assert.equal(list[0].reportNote, 'fertig');
		assert.equal((await listConfirmations(db, sa)).length, 3);
		assert.equal((await listConfirmations(db, otherAdmin)).length, 0);
	});

	test('keeps soft-deleted tasks', async () => {
		const { taskId } = await reported();
		await deleteTask(db, admin, taskId);
		const [item] = await listConfirmations(db, admin);
		assert.equal(item.task.deleted, true);
	});
});

describe('confirmShift', () => {
	test('confirms, credits the assignee, records who and the thanks', async () => {
		const { taskId, shiftId } = await reported();
		await confirmShift(db, admin, shiftId, { hours: '2', note: 'Danke!' });

		const own = await getOwnAccount(db, kim);
		assert.equal(own.balanceTenths, 20, 'corrected hours are credited');
		assert.equal(own.entries[0].task?.id, taskId);

		const s = (await getTaskForAdmin(db, sa, taskId)).shift;
		assert.equal(s.status, 'confirmed');
		assert.equal(await listConfirmations(db, admin).then((l) => l.length), 0);
	});

	test('only once', async () => {
		const { shiftId } = await reported();
		await confirmShift(db, admin, shiftId, { hours: '1,5' });
		assert.deepEqual(await codeOf(() => confirmShift(db, admin, shiftId, { hours: '1,5' })), {
			code: 'shift_not_reported'
		});
		assert.equal((await getOwnAccount(db, kim)).balanceTenths, 15);
	});

	test('outside the admin’s categories: forbidden', async () => {
		const { shiftId } = await reported();
		assert.deepEqual(await codeOf(() => confirmShift(db, otherAdmin, shiftId, { hours: '1' })), {
			code: 'forbidden'
		});
	});

	test('admins can’t confirm their own shift, superadmins can', async () => {
		const mine = await reported(admin);
		assert.deepEqual(await codeOf(() => confirmShift(db, admin, mine.shiftId, { hours: '1' })), {
			code: 'shift_confirm_own'
		});
		const [item] = await listConfirmations(db, admin);
		assert.equal(item.own, true);
		assert.equal(item.canConfirm, false);

		const saOwn = await reported(sa);
		await confirmShift(db, sa, saOwn.shiftId, { hours: '1' });
		assert.equal((await getOwnAccount(db, sa)).balanceTenths, 10);
	});

	test('hours are validated like on the task form', async () => {
		const { shiftId } = await reported();
		const result = await codeOf(() => confirmShift(db, admin, shiftId, { hours: '0' }));
		assert.deepEqual(result.fields, { hours: 'task_hours_too_small' });
	});

	test('the account shows the thanks and who sent it', async () => {
		const { shiftId } = await reported();
		await confirmShift(db, admin, shiftId, { hours: '1,5', note: 'Danke dir!' });
		const [entry] = (await getOwnAccount(db, kim)).entries;
		assert.deepEqual(entry.thanks, { note: 'Danke dir!', from: 'Alex' });
	});

	test('no note, no thanks', async () => {
		const { shiftId } = await reported();
		await confirmShift(db, admin, shiftId, { hours: '1,5' });
		assert.equal((await getOwnAccount(db, kim)).entries[0].thanks, null);
	});
});

describe('sendBackShift', () => {
	test('back to taken; the member sees the reason and can report again', async () => {
		const { taskId, shiftId } = await reported();
		await sendBackShift(db, admin, shiftId, { note: 'Bitte auch den Rasen' });

		const detail = await getTaskForMember(db, kim, taskId);
		assert.equal(detail.shift.status, 'taken');
		assert.deepEqual(detail.notes, { report: 'fertig', sentBack: 'Bitte auch den Rasen' });

		await reportShift(db, kim, shiftId, {});
		assert.equal((await getTaskForMember(db, kim, taskId)).notes?.sentBack, null);
	});

	test('needs a reason', async () => {
		const { shiftId } = await reported();
		const result = await codeOf(() => sendBackShift(db, admin, shiftId, { note: '  ' }));
		assert.deepEqual(result.fields, { note: 'shift_send_back_note_required' });
	});
});

describe('hours lock', () => {
	test('hours can’t change once confirmed; other fields can', async () => {
		const { taskId, shiftId } = await reported();
		await confirmShift(db, admin, shiftId, { hours: '1,5' });

		const result = await codeOf(() => updateTask(db, admin, taskId, input({ hours: '3' })));
		assert.deepEqual(result.fields, { hours: 'shift_hours_locked' });
		await updateTask(db, admin, taskId, input({ title: 'Hecke geschnitten' }));
	});
});
