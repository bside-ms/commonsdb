import assert from 'node:assert/strict';
import { after, beforeEach, describe, test } from 'node:test';
import { createTestDb, insertCategories, insertUser } from '@commonsdb/db/testing';
import { DomainError, ValidationError } from '../errors.ts';
import type { Actor } from '../roles.ts';
import {
	createTask,
	deleteTask,
	duplicateTask,
	getTaskForAdmin,
	getTaskForMember,
	listAdminCapabilities,
	listManageableCategories,
	listTasksForAdmin,
	listTasksForMember,
	releaseShift,
	reportShift,
	restoreTask,
	setCapabilities,
	takeShift,
	updateTask
} from './service.ts';
import { shift } from '@commonsdb/db/schema';
import { eq } from 'drizzle-orm';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

// ---- fixtures ---------------------------------------------------------------

let superadmin: Actor, admin: Actor, otherAdmin: Actor, kim: Actor, lu: Actor;
let cat: Record<string, string>, sup: Record<string, string>;

beforeEach(async () => {
	await t.reset();
	superadmin = await insertUser(db, { id: 'sa', role: 'superadmin' });
	admin = await insertUser(db, { id: 'ad', name: 'Alex', role: 'admin' });
	otherAdmin = await insertUser(db, { id: 'ad2', role: 'admin' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
	lu = await insertUser(db, { id: 'lu', name: 'Lu' });
	({ cat, sup } = await insertCategories(db, {
		'Haus & Hof': ['Garten', 'Reinigung'],
		Küche: ['Kochen']
	}));
	await setCapabilities(db, superadmin, admin.id, [cat.Garten, cat.Reinigung]);
});

/** Valid form input; override what a test is about. */
const input = (over: Record<string, unknown> = {}) => ({
	title: 'Hecke schneiden',
	categoryId: cat.Garten,
	whenKind: 'date',
	startsOn: '2026-11-20',
	shifts: [{ hours: '1,5' }],
	...over
});

/** Runs fn, expects a DomainError, returns its code (and fields for validation). */
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

const shiftOf = async (taskId: string) => (await getTaskForAdmin(db, superadmin, taskId)).shifts[0];

// ---- creating and editing ---------------------------------------------------

describe('createTask', () => {
	test('stores the task with one open shift; hours as tenths', async () => {
		const id = await createTask(db, admin, input({ urgent: 'on', place: '  Hof  ' }));
		const task = await getTaskForAdmin(db, admin, id);
		assert.equal(task.shifts[0].hoursTenths, 15);
		assert.equal(task.urgent, true);
		assert.equal(task.place, 'Hof', 'trimmed');
		assert.equal(task.contact, null, 'empty text becomes null');
		assert.equal(task.endsOn, null);
		assert.deepEqual(task.shifts[0].status, 'open');
	});

	test('reports one code per invalid field', async () => {
		const result = await codeOf(() =>
			createTask(
				db,
				admin,
				input({ title: ' ', shifts: [{ hours: '0,7' }], startsOn: '20.11.2026' })
			)
		);
		assert.deepEqual(result, {
			code: 'validation_failed',
			fields: {
				title: 'task_title_required',
				startsOn: 'task_starts_on_invalid',
				'shifts.0.hours': 'task_hours_half_steps'
			}
		});
	});

	test('missing fields are reported as codes', async () => {
		const result = await codeOf(() => createTask(db, admin, { categoryId: cat.Garten }));
		assert.deepEqual(result, {
			code: 'validation_failed',
			fields: {
				title: 'field_required',
				whenKind: 'field_required',
				startsOn: 'field_required',
				shifts: 'field_required'
			}
		});
	});

	test('a range needs an end on or after the start', async () => {
		const before = await codeOf(() =>
			createTask(db, admin, input({ whenKind: 'range', endsOn: '2026-11-01' }))
		);
		assert.deepEqual(before, {
			code: 'validation_failed',
			fields: { endsOn: 'task_ends_before_start' }
		});
		const id = await createTask(db, admin, input({ whenKind: 'range', endsOn: '2026-11-27' }));
		assert.equal((await getTaskForAdmin(db, admin, id)).endsOn, '2026-11-27');
	});

	test('validates the description against the rich-text profile', async () => {
		const evil = JSON.stringify({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:x' } }] }
					]
				}
			]
		});
		assert.deepEqual(await codeOf(() => createTask(db, admin, input({ description: evil }))), {
			code: 'validation_failed',
			fields: { description: 'task_description_link_invalid' }
		});
	});

	test('only in categories the admin manages', async () => {
		assert.deepEqual(await codeOf(() => createTask(db, admin, input({ categoryId: cat.Kochen }))), {
			code: 'forbidden'
		});
		assert.deepEqual(await codeOf(() => createTask(db, otherAdmin, input())), {
			code: 'forbidden'
		});
		assert.deepEqual(await codeOf(() => createTask(db, kim, input())), { code: 'forbidden' });
		await createTask(db, superadmin, input({ categoryId: cat.Kochen })); // superadmin: anywhere
	});
});

describe('updateTask', () => {
	test('changes fields and hours', async () => {
		const id = await createTask(db, admin, input());
		const s = await shiftOf(id);
		await updateTask(
			db,
			admin,
			id,
			input({ title: 'Hecke (Hof)', shifts: [{ id: s.id, hours: 2 }] })
		);
		const task = await getTaskForAdmin(db, admin, id);
		assert.equal(task.title, 'Hecke (Hof)');
		assert.deepEqual(
			task.shifts.map((x) => [x.id, x.hoursTenths]),
			[[s.id, 20]]
		);
	});

	test('moving to another category needs both categories', async () => {
		const id = await createTask(db, admin, input());
		assert.deepEqual(
			await codeOf(() => updateTask(db, admin, id, input({ categoryId: cat.Kochen }))),
			{ code: 'forbidden' }
		);
		await updateTask(db, admin, id, input({ categoryId: cat.Reinigung }));
	});
});

describe('duplicate, delete, restore', () => {
	test('a copy gets a fresh open shift, even if the original is taken', async () => {
		const id = await createTask(db, admin, input());
		await takeShift(db, kim, (await shiftOf(id)).id);
		const copy = await duplicateTask(db, admin, id);
		assert.notEqual(copy, id);
		assert.equal((await shiftOf(copy)).status, 'open');
		assert.equal((await getTaskForAdmin(db, admin, copy)).title, 'Hecke schneiden');
	});

	test('deleted tasks leave the member list and the active admin list, and come back', async () => {
		const id = await createTask(db, admin, input());
		await deleteTask(db, admin, id);
		assert.equal((await listTasksForMember(db, kim)).length, 0);
		assert.equal((await listTasksForAdmin(db, admin)).length, 0);
		assert.equal((await listTasksForAdmin(db, admin, { deleted: true })).length, 1);
		await restoreTask(db, admin, id);
		assert.equal((await listTasksForMember(db, kim)).length, 1);
	});

	test('only in managed categories', async () => {
		const id = await createTask(db, admin, input());
		assert.deepEqual(await codeOf(() => deleteTask(db, otherAdmin, id)), { code: 'forbidden' });
		assert.deepEqual(await codeOf(() => duplicateTask(db, otherAdmin, id)), { code: 'forbidden' });
	});
});

// ---- taking and releasing ---------------------------------------------------

describe('takeShift', () => {
	test('assigns the member; others no longer see the task', async () => {
		const id = await createTask(db, admin, input());
		await takeShift(db, kim, (await shiftOf(id)).id);

		const [mine] = await listTasksForMember(db, kim);
		assert.equal(mine.shifts.mine?.status, 'taken');
		assert.deepEqual(await listTasksForMember(db, lu), []);
		assert.deepEqual(await codeOf(() => getTaskForMember(db, lu, id)), {
			code: 'task_not_found'
		});
		assert.equal((await shiftOf(id)).assigneeName, 'Kim');
	});

	test('two people at once: exactly one gets it', async () => {
		const id = await createTask(db, admin, input());
		const shiftId = (await shiftOf(id)).id;
		const results = await Promise.allSettled([
			takeShift(db, kim, shiftId),
			takeShift(db, lu, shiftId)
		]);
		assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
		const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
		assert.equal(rejected.reason.code, 'shift_not_open');
	});

	test('not on deleted tasks', async () => {
		const id = await createTask(db, admin, input());
		await deleteTask(db, admin, id);
		assert.deepEqual(await codeOf(async () => takeShift(db, kim, (await shiftOf(id)).id)), {
			code: 'shift_not_open'
		});
	});
});

describe('releaseShift', () => {
	test('by the assignee: open for everyone again', async () => {
		const id = await createTask(db, admin, input());
		const shiftId = (await shiftOf(id)).id;
		await takeShift(db, kim, shiftId);
		await releaseShift(db, kim, shiftId);
		assert.equal((await shiftOf(id)).status, 'open');
		assert.equal((await listTasksForMember(db, lu)).length, 1);
	});

	test('by another member: forbidden; by an admin of the category: fine', async () => {
		const id = await createTask(db, admin, input());
		const shiftId = (await shiftOf(id)).id;
		await takeShift(db, kim, shiftId);
		assert.deepEqual(await codeOf(() => releaseShift(db, lu, shiftId)), { code: 'forbidden' });
		assert.deepEqual(await codeOf(() => releaseShift(db, otherAdmin, shiftId)), {
			code: 'forbidden'
		});
		await releaseShift(db, admin, shiftId);
		assert.equal((await shiftOf(id)).assigneeName, null);
	});

	test('an open shift cannot be released', async () => {
		const id = await createTask(db, admin, input());
		assert.deepEqual(await codeOf(async () => releaseShift(db, kim, (await shiftOf(id)).id)), {
			code: 'shift_not_taken'
		});
	});
});

// ---- lists ------------------------------------------------------------------

describe('listTasksForMember', () => {
	test('urgent first, then by date; filters by text, category and super category', async () => {
		await createTask(db, admin, input({ title: 'Später', startsOn: '2026-12-01' }));
		await createTask(db, admin, input({ title: 'Früher', startsOn: '2026-11-10' }));
		await createTask(db, admin, input({ title: 'Eilig', startsOn: '2026-12-24', urgent: true }));
		await createTask(db, superadmin, input({ title: 'Suppe', categoryId: cat.Kochen }));

		const titles = async (f = {}) => (await listTasksForMember(db, kim, f)).map((x) => x.title);
		assert.deepEqual(await titles(), ['Eilig', 'Früher', 'Suppe', 'Später']);
		assert.deepEqual(await titles({ q: 'üh' }), ['Früher']);
		assert.deepEqual(await titles({ q: '%' }), [], '% is matched literally');
		assert.deepEqual(await titles({ categoryId: cat.Kochen }), ['Suppe']);
		assert.deepEqual(await titles({ superCategoryId: sup['Haus & Hof'] }), [
			'Eilig',
			'Früher',
			'Später'
		]);
	});

	test('own shifts stay listed until confirmed', async () => {
		const id = await createTask(db, admin, input());
		const s = await shiftOf(id);
		await takeShift(db, kim, s.id);
		await reportShift(db, kim, s.id, {});
		assert.equal((await listTasksForMember(db, kim)).length, 1);

		await db.update(shift).set({ status: 'confirmed' }).where(eq(shift.id, s.id));
		assert.equal((await listTasksForMember(db, kim)).length, 0);
		// still reachable for the account screen's link
		assert.equal((await getTaskForMember(db, kim, id)).shifts[0].status, 'confirmed');
	});
});

describe('listTasksForAdmin', () => {
	test('scoped to the admin’s categories; the assignee is named', async () => {
		const garden = await createTask(db, admin, input());
		await createTask(db, superadmin, input({ title: 'Suppe', categoryId: cat.Kochen }));
		await takeShift(db, kim, (await shiftOf(garden)).id);

		const list = await listTasksForAdmin(db, admin);
		assert.deepEqual(
			list.map((x) => [x.title, x.shifts[0].assigneeName]),
			[['Hecke schneiden', 'Kim']]
		);
		assert.equal((await listTasksForAdmin(db, superadmin)).length, 2);
		assert.deepEqual(await listTasksForAdmin(db, otherAdmin), []);
		assert.deepEqual(await listTasksForAdmin(db, kim), []);
	});
});

// ---- capabilities -----------------------------------------------------------

describe('capabilities', () => {
	test('replace the set; manageable categories follow', async () => {
		await setCapabilities(db, superadmin, otherAdmin.id, [cat.Kochen, cat.Kochen]);
		const groups = await listManageableCategories(db, otherAdmin);
		assert.deepEqual(
			groups.map((g) => [g.name, g.categories.map((c) => c.name)]),
			[['Küche', ['Kochen']]]
		);
		const admins = await listAdminCapabilities(db, superadmin);
		assert.deepEqual(
			admins.map((a) => [a.id, a.categoryIds.length]),
			[
				['ad', 2],
				['ad2', 1]
			]
		);
	});

	test('only superadmins manage them', async () => {
		assert.deepEqual(await codeOf(() => setCapabilities(db, admin, admin.id, [cat.Kochen])), {
			code: 'forbidden'
		});
		assert.deepEqual(await codeOf(() => listAdminCapabilities(db, admin)), { code: 'forbidden' });
	});
});

describe('reportShift', () => {
	test('the assignee reports with a note; it shows on their detail', async () => {
		const id = await createTask(db, admin, input());
		const s = await shiftOf(id);
		await takeShift(db, kim, s.id);
		await reportShift(db, kim, s.id, { note: '  Alles geschnitten  ' });

		const detail = await getTaskForMember(db, kim, id);
		assert.equal(detail.shifts[0].status, 'reported');
		assert.deepEqual(detail.shifts[0].notes, { report: 'Alles geschnitten', sentBack: null });
	});

	test('the note is optional', async () => {
		const id = await createTask(db, admin, input());
		const s = await shiftOf(id);
		await takeShift(db, kim, s.id);
		await reportShift(db, kim, s.id, {});
		assert.equal((await getTaskForMember(db, kim, id)).shifts[0].notes?.report, null);
	});

	test('only the assignee, only while taken', async () => {
		const id = await createTask(db, admin, input());
		const s = await shiftOf(id);
		assert.deepEqual(await codeOf(() => reportShift(db, kim, s.id, {})), {
			code: 'shift_not_reportable'
		});
		await takeShift(db, kim, s.id);
		assert.deepEqual(await codeOf(() => reportShift(db, lu, s.id, {})), {
			code: 'shift_not_reportable'
		});
		await reportShift(db, kim, s.id, {});
		assert.deepEqual(await codeOf(() => reportShift(db, kim, s.id, {})), {
			code: 'shift_not_reportable'
		});
	});

	test('a reported shift can no longer be released', async () => {
		const id = await createTask(db, admin, input());
		const s = await shiftOf(id);
		await takeShift(db, kim, s.id);
		await reportShift(db, kim, s.id, {});
		assert.deepEqual(await codeOf(() => releaseShift(db, kim, s.id)), {
			code: 'shift_not_taken'
		});
	});

	test('reporting again clears a send-back note', async () => {
		const id = await createTask(db, admin, input());
		const s = await shiftOf(id);
		await takeShift(db, kim, s.id);
		// step 3's sendBackShift, by hand until it exists
		await db.update(shift).set({ sendBackNote: 'Bitte auch den Rasen' }).where(eq(shift.id, s.id));
		await reportShift(db, kim, s.id, {});
		assert.equal((await getTaskForMember(db, kim, id)).shifts[0].notes?.sentBack, null);
	});

	test('notes too long are rejected', async () => {
		const id = await createTask(db, admin, input());
		const s = await shiftOf(id);
		await takeShift(db, kim, s.id);
		const result = await codeOf(() => reportShift(db, kim, s.id, { note: 'x'.repeat(1001) }));
		assert.deepEqual(result.fields, { note: 'shift_note_too_long' });
	});
});

// ---- several shifts (slice 4) -------------------------------------------------

/** Three shifts: two in parallel in the morning, one in the evening past midnight. */
const threeShifts = () =>
	input({
		shifts: [
			{ startsTime: '22:00', endsTime: '02:00', hours: 4 },
			{ startsTime: '10:00', endsTime: '12:00', hours: 2 },
			{ startsTime: '10:00', endsTime: '12:00', hours: '1,5' }
		]
	});

const shiftsOf = async (taskId: string) => (await getTaskForAdmin(db, superadmin, taskId)).shifts;

describe('shift windows', () => {
	test('stored per shift, listed by start time; past midnight is the next day', async () => {
		const id = await createTask(db, admin, threeShifts());
		const shifts = await shiftsOf(id);
		assert.deepEqual(
			shifts.map((s) => [s.startsTime, s.endsTime, s.endsNextDay, s.hoursTenths]),
			[
				['10:00', '12:00', false, 20],
				['10:00', '12:00', false, 15],
				['22:00', '02:00', true, 40]
			]
		);
	});

	test('times both or neither, well-formed; one code per field', async () => {
		const result = await codeOf(() =>
			createTask(
				db,
				admin,
				input({
					shifts: [
						{ startsTime: '10:00', hours: 1 },
						{ startsTime: '25:00', endsTime: '26:00', hours: 1 }
					]
				})
			)
		);
		assert.deepEqual(result, {
			code: 'validation_failed',
			fields: {
				'shifts.0.endsTime': 'shift_time_incomplete',
				'shifts.1.startsTime': 'shift_time_invalid',
				'shifts.1.endsTime': 'shift_time_invalid'
			}
		});
	});

	test('a task needs at least one shift', async () => {
		const result = await codeOf(() => createTask(db, admin, input({ shifts: [] })));
		assert.deepEqual(result.fields, { shifts: 'task_shifts_required' });
	});

	test('duplicating copies the templates, all open', async () => {
		const id = await createTask(db, admin, threeShifts());
		await takeShift(db, kim, (await shiftsOf(id))[0].id);
		const copy = await shiftsOf(await duplicateTask(db, admin, id));
		assert.deepEqual(
			copy.map((s) => [s.startsTime, s.hoursTenths, s.status]),
			[
				['10:00', 20, 'open'],
				['10:00', 15, 'open'],
				['22:00', 40, 'open']
			]
		);
	});
});

describe('updateTask with several shifts', () => {
	/** The form as it would post back the current shifts, with changes. */
	const formShifts = async (taskId: string) =>
		(await shiftsOf(taskId)).map((s) => ({
			id: s.id,
			startsTime: s.startsTime ?? '',
			endsTime: s.endsTime ?? '',
			hours: s.hoursTenths / 10
		}));

	test('adds, changes and removes open shifts', async () => {
		const id = await createTask(db, admin, threeShifts());
		const [first, second] = await formShifts(id);
		await updateTask(
			db,
			admin,
			id,
			input({
				shifts: [
					{ ...first, startsTime: '09:00' },
					{ ...second, hours: 3 },
					{ startsTime: '', endsTime: '', hours: 1 }
				]
			})
		);
		assert.deepEqual(
			(await shiftsOf(id)).map((s) => [s.startsTime, s.endsTime, s.hoursTenths]),
			[
				['09:00', '12:00', 20],
				['10:00', '12:00', 30],
				[null, null, 10]
			]
		);
	});

	test('a taken shift keeps its window and stays; its hours may change', async () => {
		const id = await createTask(db, admin, threeShifts());
		const shifts = await formShifts(id);
		await takeShift(db, kim, shifts[0].id);

		const retimed = await codeOf(() =>
			updateTask(
				db,
				admin,
				id,
				input({ shifts: [{ ...shifts[0], startsTime: '08:00' }, ...shifts.slice(1)] })
			)
		);
		assert.deepEqual(retimed.fields, { 'shifts.0.startsTime': 'shift_time_locked' });

		const removed = await codeOf(() =>
			updateTask(db, admin, id, input({ shifts: shifts.slice(1) }))
		);
		assert.deepEqual(removed.fields, { shifts: 'shift_remove_locked' });

		await updateTask(
			db,
			admin,
			id,
			input({ shifts: [{ ...shifts[0], hours: 3 }, ...shifts.slice(1)] })
		);
		assert.equal((await shiftsOf(id))[0].hoursTenths, 30);
		assert.equal((await shiftsOf(id))[0].assigneeName, 'Kim', 'still hers');
	});

	test('confirmed hours are locked', async () => {
		const id = await createTask(db, admin, threeShifts());
		const shifts = await formShifts(id);
		await db
			.update(shift)
			.set({ status: 'confirmed', assigneeId: kim.id })
			.where(eq(shift.id, shifts[0].id));
		const result = await codeOf(() =>
			updateTask(db, admin, id, input({ shifts: [{ ...shifts[0], hours: 3 }, ...shifts.slice(1)] }))
		);
		assert.deepEqual(result.fields, { 'shifts.0.hours': 'shift_hours_locked' });
	});

	test('ids must belong to the task, once', async () => {
		const id = await createTask(db, admin, threeShifts());
		const other = await createTask(db, admin, input());
		const shifts = await formShifts(id);
		const foreign = (await shiftOf(other)).id;
		const result = await codeOf(() =>
			updateTask(
				db,
				admin,
				id,
				input({ shifts: [...shifts, { ...shifts[0] }, { id: foreign, hours: 1 }] })
			)
		);
		assert.deepEqual(result.fields, {
			'shifts.3.id': 'shift_not_found',
			'shifts.4.id': 'shift_not_found'
		});
	});
});

describe('taking one of several shifts', () => {
	test('one shift per member per task', async () => {
		const id = await createTask(db, admin, threeShifts());
		const [a, b] = await shiftsOf(id);
		await takeShift(db, kim, a.id);
		assert.deepEqual(await codeOf(() => takeShift(db, kim, b.id)), {
			code: 'shift_one_per_member'
		});
		await takeShift(db, lu, b.id);
	});

	test('the task stays listed while a shift is free; members see who else is on it', async () => {
		const id = await createTask(db, admin, threeShifts());
		const [a] = await shiftsOf(id);
		await takeShift(db, kim, a.id);

		const [forLu] = await listTasksForMember(db, lu);
		assert.equal(forLu.shifts.total, 3);
		assert.equal(forLu.shifts.free, 2);
		assert.equal(forLu.shifts.mine, null);

		const detail = await getTaskForMember(db, lu, id);
		assert.deepEqual(
			detail.shifts.map((s) => [s.status, s.assigneeName, s.mine, s.notes]),
			[
				['taken', 'Kim', false, null],
				['open', null, false, null],
				['open', null, false, null]
			]
		);

		const [forKim] = await listTasksForMember(db, kim);
		assert.deepEqual(forKim.shifts.mine, { id: a.id, status: 'taken', hoursTenths: 20 });
	});

	test('once every shift is taken, only the people on it see the task', async () => {
		const id = await createTask(db, admin, threeShifts());
		const [a, b, c] = await shiftsOf(id);
		const ana = await insertUser(db, { id: 'ana', name: 'Ana' });
		await takeShift(db, kim, a.id);
		await takeShift(db, lu, b.id);
		await takeShift(db, ana, c.id);
		const ben = await insertUser(db, { id: 'ben', name: 'Ben' });
		assert.deepEqual(await listTasksForMember(db, ben), []);
		assert.deepEqual(await codeOf(() => getTaskForMember(db, ben, id)), {
			code: 'task_not_found'
		});
		assert.equal((await listTasksForMember(db, lu)).length, 1);
	});
});

describe('member filters', () => {
	test('summary: parallel slots, together, hours range', async () => {
		await createTask(db, admin, threeShifts());
		const [t] = await listTasksForMember(db, kim);
		assert.equal(t.shifts.parallel, 2);
		assert.equal(t.shifts.together, true);
		assert.deepEqual(t.shifts.hoursTenths, { min: 15, max: 40 });
	});

	test('urgent only, doable now, together only', async () => {
		const today = '2026-11-20';
		await createTask(db, admin, input({ title: 'Heute allein', startsOn: today }));
		await createTask(db, admin, { ...threeShifts(), title: 'Heute zusammen', startsOn: today });
		await createTask(
			db,
			admin,
			input({
				title: 'Woche',
				whenKind: 'range',
				startsOn: '2026-11-18',
				endsOn: '2026-11-22',
				urgent: true
			})
		);
		await createTask(db, admin, input({ title: 'Morgen', startsOn: '2026-11-21' }));

		const titles = async (f = {}) =>
			(await listTasksForMember(db, kim, f, { today })).map((x) => x.title).sort();
		assert.deepEqual(await titles({ urgent: true }), ['Woche']);
		assert.deepEqual(await titles({ now: true }), ['Heute allein', 'Heute zusammen', 'Woche']);
		assert.deepEqual(await titles({ together: 'on' }), ['Heute zusammen']);
		assert.deepEqual(await titles({ now: true, together: true }), ['Heute zusammen']);
	});

	test('a task with no free shift is not doable now, even today', async () => {
		const today = '2026-11-20';
		const id = await createTask(db, admin, input({ startsOn: today }));
		await takeShift(db, kim, (await shiftOf(id)).id);
		const [t] = await listTasksForMember(db, kim, {}, { today });
		assert.equal(t.shifts.doableNow, false);
	});
});
