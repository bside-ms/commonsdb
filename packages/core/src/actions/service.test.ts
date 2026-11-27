import assert from 'node:assert/strict';
import { after, beforeEach, describe, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { createTestDb, insertCategories, insertUser } from '@commonsdb/db/testing';
import { task } from '@commonsdb/db/schema';
import { ValidationError } from '../errors.ts';
import type { Actor } from '../roles.ts';
import {
	createTask,
	deleteTask,
	getTaskForAdmin,
	getTaskForMember,
	listTasksForAction,
	listTasksForMember,
	reportShift,
	setCapabilities,
	takeShift
} from '../tasks/service.ts';
import {
	createAction,
	deleteAction,
	getAction,
	isActionLead,
	listActionsForAdmin,
	listUpcomingActions,
	markTaskForAction,
	updateAction
} from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

// ---- fixtures ---------------------------------------------------------------

let superadmin: Actor, admin: Actor, kim: Actor, lu: Actor;
let cat: Record<string, string>;

beforeEach(async () => {
	await t.reset();
	superadmin = await insertUser(db, { id: 'sa', role: 'superadmin' });
	admin = await insertUser(db, { id: 'ad', name: 'Alex', role: 'admin' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
	lu = await insertUser(db, { id: 'lu', name: 'Lu' });
	({ cat } = await insertCategories(db, { 'Haus & Hof': ['Garten'], Küche: ['Kochen'] }));
	await setCapabilities(db, superadmin, admin.id, [cat.Garten]);
});

const day = (offset: number) => {
	const d = new Date();
	d.setDate(d.getDate() + offset);
	return d.toLocaleDateString('sv'); // YYYY-MM-DD, local
};

/** Valid form input; override what a test is about. `published: undefined` = draft. */
const actionInput = (over: Record<string, unknown> = {}) => ({
	title: 'Repro-Arbeitstag',
	date: day(7),
	startsTime: '10:00',
	endsTime: '16:00',
	place: 'Innenhof',
	published: 'on',
	leadIds: [kim.id],
	...over
});

const taskInput = (over: Record<string, unknown> = {}) => ({
	title: 'Hecke schneiden',
	categoryId: cat.Garten,
	whenKind: 'date',
	startsOn: day(7),
	shifts: [{ hours: '2' }],
	...over
});

const titles = (rows: { title: string }[]) => rows.map((r) => r.title);
const firstShift = async (taskId: string) =>
	(await getTaskForAdmin(db, superadmin, taskId)).shifts[0];

// ---- writing ----------------------------------------------------------------

describe('createAction / updateAction', () => {
	test('admins create; times come back as HH:MM; leads sorted by name', async () => {
		const id = await createAction(db, admin, actionInput({ leadIds: [lu.id, kim.id] }));
		const a = await getAction(db, kim, id);
		assert.equal(a.startsTime, '10:00');
		assert.equal(a.endsTime, '16:00');
		assert.deepEqual(
			a.leads.map((l) => l.name),
			['Kim', 'Lu']
		);
		assert.ok(a.publishedAt);
	});

	test('members may not write or list for admins', async () => {
		await assert.rejects(createAction(db, kim, actionInput()), { code: 'forbidden' });
		await assert.rejects(listActionsForAdmin(db, kim), { code: 'forbidden' });
	});

	test('validation: title, time format, both times or neither', async () => {
		await assert.rejects(
			createAction(db, admin, actionInput({ title: ' ' })),
			(e) => e instanceof ValidationError && e.fields.title === 'action_title_required'
		);
		await assert.rejects(
			createAction(db, admin, actionInput({ startsTime: '25:00' })),
			(e) => e instanceof ValidationError && e.fields.startsTime === 'action_time_invalid'
		);
		await assert.rejects(
			createAction(db, admin, actionInput({ endsTime: '' })),
			(e) => e instanceof ValidationError
		);
		// no times at all is fine
		const id = await createAction(db, admin, actionInput({ startsTime: '', endsTime: '' }));
		assert.equal((await getAction(db, admin, id)).startsTime, null);
	});

	test('update replaces leads; publishing keeps the first date; unticking makes a draft', async () => {
		const id = await createAction(db, admin, actionInput());
		const first = (await getAction(db, admin, id)).publishedAt;

		await updateAction(db, admin, id, actionInput({ title: 'Hoftag', leadIds: [lu.id] }));
		let a = await getAction(db, admin, id);
		assert.equal(a.title, 'Hoftag');
		assert.deepEqual(a.publishedAt, first);
		assert.equal(await isActionLead(db, kim, id), false);
		assert.equal(await isActionLead(db, lu, id), true);

		await updateAction(db, admin, id, actionInput({ published: undefined, leadIds: undefined }));
		a = await getAction(db, admin, id);
		assert.equal(a.publishedAt, null);
		assert.deepEqual(a.leads, []);
	});

	test('unknown id', async () => {
		await assert.rejects(updateAction(db, admin, crypto.randomUUID(), actionInput()), {
			code: 'action_not_found'
		});
		await assert.rejects(deleteAction(db, admin, crypto.randomUUID()), {
			code: 'action_not_found'
		});
	});
});

// ---- reading ----------------------------------------------------------------

describe('reading', () => {
	test('members see neither drafts nor past Aktionen in the teaser; soonest first', async () => {
		await createAction(db, admin, actionInput({ title: 'Entwurf', published: undefined }));
		await createAction(db, admin, actionInput({ title: 'Vorbei', date: day(-1) }));
		await createAction(db, admin, actionInput({ title: 'Später', date: day(14) }));
		await createAction(db, admin, actionInput({ title: 'Bald', date: day(3) }));
		assert.deepEqual(titles(await listUpcomingActions(db, { today: day(0) })), ['Bald', 'Später']);
	});

	test('a draft is only visible to admins', async () => {
		const id = await createAction(db, admin, actionInput({ published: undefined }));
		await assert.rejects(getAction(db, kim, id), { code: 'action_not_found' });
		assert.equal((await getAction(db, admin, id)).title, 'Repro-Arbeitstag');
	});

	test('admin list: upcoming soonest first, then past newest first', async () => {
		await createAction(db, admin, actionInput({ title: 'Lange her', date: day(-30) }));
		await createAction(db, admin, actionInput({ title: 'Gestern', date: day(-1) }));
		await createAction(db, admin, actionInput({ title: 'Später', date: day(14) }));
		await createAction(db, admin, actionInput({ title: 'Bald', date: day(3) }));
		assert.deepEqual(titles(await listActionsForAdmin(db, admin)), [
			'Bald',
			'Später',
			'Gestern',
			'Lange her'
		]);
	});
});

// ---- marking tasks ----------------------------------------------------------

describe('markTaskForAction', () => {
	test('needs the task category; unmarking too', async () => {
		const actionId = await createAction(db, admin, actionInput());
		const garden = await createTask(db, admin, taskInput());
		const cooking = await createTask(db, superadmin, taskInput({ categoryId: cat.Kochen }));

		await markTaskForAction(db, admin, garden, actionId);
		await assert.rejects(markTaskForAction(db, admin, cooking, actionId), { code: 'forbidden' });
		await assert.rejects(markTaskForAction(db, kim, garden, null), { code: 'forbidden' });

		await markTaskForAction(db, admin, garden, null);
		assert.deepEqual(await listTasksForAction(db, admin, actionId), []);
	});

	test('unknown Aktion, deleted task', async () => {
		const garden = await createTask(db, admin, taskInput());
		await assert.rejects(markTaskForAction(db, admin, garden, crypto.randomUUID()), {
			code: 'action_not_found'
		});
		await deleteTask(db, admin, garden);
		await assert.rejects(markTaskForAction(db, admin, garden, null), { code: 'task_not_found' });
	});

	test('a task belongs to at most one Aktion: marking again moves it', async () => {
		const a = await createAction(db, admin, actionInput({ title: 'A' }));
		const b = await createAction(db, admin, actionInput({ title: 'B' }));
		const garden = await createTask(db, admin, taskInput());
		await markTaskForAction(db, admin, garden, a);
		await markTaskForAction(db, admin, garden, b);
		assert.equal((await listTasksForAction(db, admin, a)).length, 0);
		assert.equal((await listTasksForAction(db, admin, b)).length, 1);
	});

	test('deleting the Aktion keeps its tasks, unmarked', async () => {
		const actionId = await createAction(db, admin, actionInput());
		const garden = await createTask(db, admin, taskInput());
		await markTaskForAction(db, admin, garden, actionId);
		await deleteAction(db, admin, actionId);

		const [row] = await db
			.select({ actionId: task.actionId })
			.from(task)
			.where(eq(task.id, garden));
		assert.equal(row.actionId, null);
		assert.equal((await getTaskForAdmin(db, admin, garden)).deleted, false);
	});
});

// ---- the Aktion's task list -------------------------------------------------

describe('listTasksForAction', () => {
	test('full tasks included, with names and done; deleted tasks left out', async () => {
		const actionId = await createAction(db, admin, actionInput());
		const hedge = await createTask(
			db,
			admin,
			taskInput({ shifts: [{ hours: '2' }, { hours: '2' }] })
		);
		const leaves = await createTask(db, admin, taskInput({ title: 'Laub rechen' }));
		const gone = await createTask(db, admin, taskInput({ title: 'Weg' }));
		for (const id of [hedge, leaves, gone]) await markTaskForAction(db, admin, id, actionId);
		await deleteTask(db, admin, gone);

		await takeShift(db, kim, (await firstShift(hedge)).id);
		const leaf = await firstShift(leaves);
		await takeShift(db, lu, leaf.id);
		await reportShift(db, lu, leaf.id, {});

		const list = await listTasksForAction(db, kim, actionId);
		const by = Object.fromEntries(list.map((x) => [x.title, x]));
		assert.deepEqual(Object.keys(by).sort(), ['Hecke schneiden', 'Laub rechen']);

		assert.deepEqual(by['Hecke schneiden'].people, ['Kim']);
		assert.equal(by['Hecke schneiden'].shifts.free, 1);
		assert.equal(by['Hecke schneiden'].done, false);

		assert.deepEqual(by['Laub rechen'].people, ['Lu']);
		assert.equal(by['Laub rechen'].shifts.free, 0);
		assert.equal(by['Laub rechen'].done, true);
	});

	test('member list can be filtered by Aktion', async () => {
		const actionId = await createAction(db, admin, actionInput());
		const hedge = await createTask(db, admin, taskInput());
		await createTask(db, admin, taskInput({ title: 'Anderes' }));
		await markTaskForAction(db, admin, hedge, actionId);
		assert.deepEqual(titles(await listTasksForMember(db, kim, { actionId })), ['Hecke schneiden']);
	});
});

// ---- opening a full task ----------------------------------------------------

describe('getTaskForMember and Aktionen', () => {
	test('a full task of a published Aktion can be opened; of a draft not', async () => {
		const published = await createAction(db, admin, actionInput());
		const draft = await createAction(db, admin, actionInput({ published: undefined }));
		const a = await createTask(db, admin, taskInput({ title: 'A' }));
		const b = await createTask(db, admin, taskInput({ title: 'B' }));
		await markTaskForAction(db, admin, a, published);
		await markTaskForAction(db, admin, b, draft);
		for (const id of [a, b]) await takeShift(db, kim, (await firstShift(id)).id);

		assert.equal((await getTaskForMember(db, lu, a)).title, 'A');
		await assert.rejects(getTaskForMember(db, lu, b), { code: 'task_not_found' });
	});
});
