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
	restoreTask,
	setCapabilities,
	takeShift,
	updateTask
} from './service.ts';

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
	hours: '1,5',
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

const shiftOf = async (taskId: string) => (await getTaskForAdmin(db, superadmin, taskId)).shift;

// ---- creating and editing ---------------------------------------------------

describe('createTask', () => {
	test('stores the task with one open shift; hours as tenths', async () => {
		const id = await createTask(db, admin, input({ urgent: 'on', place: '  Hof  ' }));
		const task = await getTaskForAdmin(db, admin, id);
		assert.equal(task.hoursTenths, 15);
		assert.equal(task.urgent, true);
		assert.equal(task.place, 'Hof', 'trimmed');
		assert.equal(task.contact, null, 'empty text becomes null');
		assert.equal(task.endsOn, null);
		assert.deepEqual(task.shift.status, 'open');
	});

	test('reports one code per invalid field', async () => {
		const result = await codeOf(() =>
			createTask(db, admin, input({ title: ' ', hours: '0,7', startsOn: '20.11.2026' }))
		);
		assert.deepEqual(result, {
			code: 'validation_failed',
			fields: {
				title: 'task_title_required',
				startsOn: 'task_starts_on_invalid',
				hours: 'task_hours_half_steps'
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
				hours: 'field_required'
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
		await updateTask(db, admin, id, input({ title: 'Hecke (Hof)', hours: 2 }));
		const task = await getTaskForAdmin(db, admin, id);
		assert.equal(task.title, 'Hecke (Hof)');
		assert.equal(task.hoursTenths, 20);
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
		assert.equal(mine.shift.mine, true);
		assert.equal(mine.shift.status, 'taken');
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
});

describe('listTasksForAdmin', () => {
	test('scoped to the admin’s categories; the assignee is named', async () => {
		const garden = await createTask(db, admin, input());
		await createTask(db, superadmin, input({ title: 'Suppe', categoryId: cat.Kochen }));
		await takeShift(db, kim, (await shiftOf(garden)).id);

		const list = await listTasksForAdmin(db, admin);
		assert.deepEqual(
			list.map((x) => [x.title, x.shift.assigneeName]),
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
