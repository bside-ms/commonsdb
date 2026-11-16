import assert from 'node:assert/strict';
import { after, beforeEach, describe, test } from 'node:test';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { createTestDb, insertCategories, insertUser } from '@commonsdb/db/testing';
import { shift, task } from '@commonsdb/db/schema';
import { DomainError, ValidationError } from '../../errors.ts';
import type { Actor } from '../../roles.ts';
import { confirmShift } from '../confirmation.ts';
import {
	deleteTask,
	getTaskForAdmin,
	listTasksForMember,
	reportShift,
	setCapabilities,
	takeShift,
	updateTask
} from '../service.ts';
import { localToday } from '../shifts.ts';
import { generateOccurrences, topUpAllSeries } from './generator.ts';
import { addDays } from './rule.ts';
import {
	addOccurrence,
	createSeries,
	deleteSeries,
	endSeries,
	getSeriesForAdmin,
	listSeriesForAdmin,
	pauseSeries,
	previewSeries,
	resumeSeries,
	updateSeries
} from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

// Real today: confirmations stamp reported_at with the real clock, and
// "every N days" counts from that day.
const TODAY = localToday();
/** Weekday of a date, 0 = Monday. */
const weekdayOf = (ymd: string) => (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7;

let superadmin: Actor, admin: Actor, otherAdmin: Actor, kim: Actor, lu: Actor;
let cat: Record<string, string>;

beforeEach(async () => {
	await t.reset();
	superadmin = await insertUser(db, { id: 'sa', role: 'superadmin' });
	admin = await insertUser(db, { id: 'ad', name: 'Alex', role: 'admin' });
	otherAdmin = await insertUser(db, { id: 'ad2', role: 'admin' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
	lu = await insertUser(db, { id: 'lu', name: 'Lu' });
	({ cat } = await insertCategories(db, { 'Haus & Hof': ['Garten'], Küche: ['Kochen'] }));
	await setCapabilities(db, superadmin, admin.id, [cat.Garten]);
});

/** Weekly on tomorrow's weekday, two shifts; override what a test is about. */
const input = (over: Record<string, unknown> = {}) => ({
	title: 'Bar putzen',
	categoryId: cat.Garten,
	shifts: [
		{ startsTime: '18:00', endsTime: '20:00', hours: 2 },
		{ startsTime: '18:00', endsTime: '20:00', hours: 2 }
	],
	repeat: 'weekly',
	weekday: String(weekdayOf(addDays(TODAY, 1))),
	anchor: TODAY,
	...over
});

/** Live occurrences of a series, by date. */
const occurrences = (seriesId: string) =>
	db
		.select({
			id: task.id,
			startsOn: task.startsOn,
			endsOn: task.endsOn,
			periodKey: task.periodKey,
			edited: task.seriesEdited
		})
		.from(task)
		.where(and(eq(task.seriesId, seriesId), isNull(task.deletedAt)))
		.orderBy(asc(task.startsOn));

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

/** Take, report and confirm the first shift of an occurrence. */
async function complete(taskId: string, who: Actor = kim) {
	const [s] = (await getTaskForAdmin(db, superadmin, taskId)).shifts;
	await takeShift(db, who, s.id);
	await reportShift(db, who, s.id, {});
	await confirmShift(db, admin, s.id, { hours: '2' });
}

describe('createSeries', () => {
	test('generates the lookahead: weekly, a week apart, with the template’s shifts', async () => {
		const id = await createSeries(db, admin, input());
		const occ = await occurrences(id);
		assert.deepEqual(
			occ.map((o) => o.startsOn),
			[addDays(TODAY, 1), addDays(TODAY, 8), addDays(TODAY, 15)]
		);
		assert.ok(occ.every((o) => o.periodKey?.startsWith('w:')));

		const first = await getTaskForAdmin(db, admin, occ[0].id);
		assert.equal(first.title, 'Bar putzen');
		assert.deepEqual(
			first.shifts.map((s) => [s.startsTime, s.hoursTenths, s.status]),
			[
				['18:00', 20, 'open'],
				['18:00', 20, 'open']
			]
		);
		// members only ever see occurrences, as ordinary tasks
		assert.equal((await listTasksForMember(db, kim)).length, 3);
	});

	test('lookahead decides how many', async () => {
		const id = await createSeries(db, admin, input({ lookahead: '5' }));
		assert.equal((await occurrences(id)).length, 5);
	});

	test('validates the rule per field', async () => {
		assert.deepEqual(await codeOf(() => createSeries(db, admin, input({ weekday: '' }))), {
			code: 'validation_failed',
			fields: { weekday: 'series_weekday_invalid' }
		});
		assert.deepEqual(
			await codeOf(() =>
				createSeries(
					db,
					admin,
					input({ whenKind: 'range', fromWeekday: '4', toWeekday: '1', lookahead: '20' })
				)
			),
			{
				code: 'validation_failed',
				fields: { toWeekday: 'series_window_reversed', lookahead: 'series_lookahead_invalid' }
			}
		);
		assert.deepEqual(
			(await codeOf(() => createSeries(db, admin, input({ until: addDays(TODAY, -1) })))).fields,
			{ until: 'series_until_before_anchor' }
		);
		assert.deepEqual(
			(await codeOf(() => createSeries(db, admin, input({ repeat: 'yearly' })))).fields,
			{ repeat: 'series_repeat_invalid' }
		);
	});

	test('only in categories the admin manages', async () => {
		assert.deepEqual(
			await codeOf(() => createSeries(db, admin, input({ categoryId: cat.Kochen }))),
			{ code: 'forbidden' }
		);
		assert.deepEqual(await codeOf(() => createSeries(db, kim, input())), { code: 'forbidden' });
	});

	test('manual: nothing until an admin adds a date', async () => {
		const id = await createSeries(db, admin, input({ repeat: 'manual' }));
		assert.equal((await occurrences(id)).length, 0);
		await addOccurrence(db, admin, id, { startsOn: addDays(TODAY, 3) });
		await addOccurrence(db, admin, id, {
			startsOn: addDays(TODAY, 10),
			endsOn: addDays(TODAY, 12)
		});
		const occ = await occurrences(id);
		assert.deepEqual(
			occ.map((o) => [o.startsOn, o.endsOn, o.periodKey]),
			[
				[addDays(TODAY, 3), null, null],
				[addDays(TODAY, 10), addDays(TODAY, 12), null]
			]
		);
	});
});

describe('generating', () => {
	test('is idempotent', async () => {
		const id = await createSeries(db, admin, input());
		assert.equal(await db.transaction((tx) => generateOccurrences(tx, id, { today: TODAY })), 0);
		assert.equal((await occurrences(id)).length, 3);
	});

	test('a deleted occurrence is not recreated; the next period fills in', async () => {
		const id = await createSeries(db, admin, input());
		const [first] = await occurrences(id);
		await deleteTask(db, admin, first.id);
		await db.transaction((tx) => generateOccurrences(tx, id, { today: TODAY }));
		assert.deepEqual(
			(await occurrences(id)).map((o) => o.startsOn),
			[addDays(TODAY, 8), addDays(TODAY, 15), addDays(TODAY, 22)]
		);
	});

	test('a confirmed occurrence stops counting; one more comes', async () => {
		const id = await createSeries(db, admin, input());
		const [first] = await occurrences(id);
		// both shifts done
		const shifts = (await getTaskForAdmin(db, superadmin, first.id)).shifts;
		for (const [s, who] of [
			[shifts[0], kim],
			[shifts[1], lu]
		] as const) {
			await takeShift(db, who, s.id);
			await reportShift(db, who, s.id, {});
			await confirmShift(db, admin, s.id, { hours: '2' });
		}
		assert.equal((await occurrences(id)).length, 4);
	});

	test('the daily top-up follows time', async () => {
		const id = await createSeries(db, admin, input());
		// a week later the first occurrence is over
		await topUpAllSeries(db, { today: addDays(TODAY, 7) });
		assert.equal((await occurrences(id)).length, 4);
		assert.equal((await occurrences(id)).at(-1)?.startsOn, addDays(TODAY, 22));
	});
});

describe('every n days (from the last completion)', () => {
	test('keeps one ahead; the next starts n days after the work was done', async () => {
		const id = await createSeries(
			db,
			admin,
			input({ repeat: 'every_n_days', days: '3', lookahead: '5', shifts: [{ hours: 2 }] })
		);
		const occ = await occurrences(id);
		assert.deepEqual(
			occ.map((o) => [o.startsOn, o.endsOn]),
			[[TODAY, addDays(TODAY, 2)]]
		);

		await complete(occ[0].id);
		const next = await occurrences(id);
		assert.deepEqual(
			next.map((o) => [o.startsOn, o.endsOn]),
			[
				[TODAY, addDays(TODAY, 2)],
				[addDays(TODAY, 3), addDays(TODAY, 5)]
			]
		);
	});
});

describe('minimum gap', () => {
	test('a completion replans the free windows that are too close', async () => {
		// a window from today over the next days, weekly; gap of 10 days
		const from = weekdayOf(TODAY);
		const id = await createSeries(
			db,
			admin,
			input({
				whenKind: 'range',
				fromWeekday: String(from),
				toWeekday: '6',
				minGapDays: '10',
				anchor: TODAY,
				shifts: [{ hours: 1 }]
			})
		);
		const before = await occurrences(id);
		assert.equal(before[0].startsOn, TODAY);

		await complete(before[0].id);
		const after = (await occurrences(id)).filter((o) => o.id !== before[0].id);
		assert.ok(
			after.every((o) => o.startsOn >= addDays(TODAY, 10)),
			`all free windows start 10 days after today: ${after.map((o) => o.startsOn)}`
		);
	});
});

describe('updateSeries', () => {
	test('replaces untouched occurrences; taken, edited and hand-added ones stay', async () => {
		// all three that stay count towards the lookahead, so make room for new ones
		const id = await createSeries(db, admin, input({ lookahead: '5' }));
		const [taken, edited, free] = await occurrences(id);
		await takeShift(db, kim, (await getTaskForAdmin(db, admin, taken.id)).shifts[0].id);
		const e = await getTaskForAdmin(db, admin, edited.id);
		await updateTask(db, admin, edited.id, {
			...input(),
			title: 'Bar putzen (Sonderfall)',
			whenKind: 'date',
			startsOn: e.startsOn,
			shifts: e.shifts.map((s) => ({
				id: s.id,
				startsTime: s.startsTime,
				endsTime: s.endsTime,
				hours: 2
			}))
		});
		const manual = await addOccurrence(db, admin, id, { startsOn: addDays(TODAY, 30) });

		await updateSeries(
			db,
			admin,
			id,
			input({
				title: 'Theke putzen',
				weekday: String(weekdayOf(addDays(TODAY, 2))),
				lookahead: '5'
			})
		);

		const occ = await occurrences(id);
		const ids = occ.map((o) => o.id);
		assert.ok(ids.includes(taken.id), 'taken stays');
		assert.ok(ids.includes(edited.id), 'edited stays');
		assert.ok(ids.includes(manual), 'hand-added stays');
		assert.ok(!ids.includes(free.id), 'untouched is replaced');
		assert.equal(occ.find((o) => o.id === edited.id)?.edited, true);

		const fresh = occ.filter((o) => ![taken.id, edited.id, manual].includes(o.id));
		assert.ok(fresh.length > 0);
		for (const o of fresh) {
			assert.equal(weekdayOf(o.startsOn), weekdayOf(addDays(TODAY, 2)), 'new weekday');
			assert.equal((await getTaskForAdmin(db, admin, o.id)).title, 'Theke putzen');
		}
		assert.equal(
			(await getTaskForAdmin(db, admin, taken.id)).title,
			'Bar putzen',
			'taken keeps its title'
		);
	});
});

describe('pause, resume, end, delete', () => {
	test('pause withdraws free occurrences, keeps taken ones; resume brings them back', async () => {
		const id = await createSeries(db, admin, input());
		const [taken] = await occurrences(id);
		await takeShift(db, kim, (await getTaskForAdmin(db, admin, taken.id)).shifts[0].id);

		await pauseSeries(db, admin, id);
		assert.deepEqual(
			(await occurrences(id)).map((o) => o.id),
			[taken.id]
		);
		assert.equal((await getSeriesForAdmin(db, admin, id)).state, 'paused');
		// paused: the top-up leaves it alone
		await topUpAllSeries(db, { today: TODAY });
		assert.equal((await occurrences(id)).length, 1);

		await resumeSeries(db, admin, id);
		assert.equal((await occurrences(id)).length, 3);
		assert.equal((await getSeriesForAdmin(db, admin, id)).state, 'running');
	});

	test('end: nothing after the last day', async () => {
		const id = await createSeries(db, admin, input());
		await endSeries(db, admin, id, { until: addDays(TODAY, 9) });
		assert.deepEqual(
			(await occurrences(id)).map((o) => o.startsOn),
			[addDays(TODAY, 1), addDays(TODAY, 8)]
		);
		assert.deepEqual(
			(await codeOf(() => endSeries(db, admin, id, { until: addDays(TODAY, -1) }))).fields,
			{ until: 'series_until_before_anchor' }
		);
	});

	test('delete: the series is gone, a taken occurrence stays for its member', async () => {
		const id = await createSeries(db, admin, input());
		const [taken] = await occurrences(id);
		await takeShift(db, kim, (await getTaskForAdmin(db, admin, taken.id)).shifts[0].id);

		await deleteSeries(db, admin, id);
		assert.deepEqual(await listSeriesForAdmin(db, admin), []);
		assert.deepEqual(
			(await occurrences(id)).map((o) => o.id),
			[taken.id]
		);
		assert.equal((await listTasksForMember(db, kim)).length, 1);
		assert.deepEqual(await codeOf(() => getSeriesForAdmin(db, admin, id)), {
			code: 'series_not_found'
		});
	});

	test('only in managed categories', async () => {
		const id = await createSeries(db, admin, input());
		assert.deepEqual(await codeOf(() => pauseSeries(db, otherAdmin, id)), { code: 'forbidden' });
		assert.deepEqual(await codeOf(() => deleteSeries(db, kim, id)), { code: 'forbidden' });
	});
});

describe('previewSeries', () => {
	test('the next dates of a rule, without saving anything', async () => {
		const ps = await previewSeries(db, admin, {
			repeat: 'weekly',
			weekday: String(weekdayOf(addDays(TODAY, 1))),
			anchor: TODAY
		});
		assert.deepEqual(
			ps.map((p) => p.startsOn),
			[addDays(TODAY, 1), addDays(TODAY, 8), addDays(TODAY, 15)]
		);
	});

	test('an incomplete rule gives no dates', async () => {
		assert.deepEqual(await previewSeries(db, admin, { repeat: 'weekly', anchor: TODAY }), []);
	});
});

describe('listSeriesForAdmin', () => {
	test('scoped; upcoming occurrences with free shifts and who is on them', async () => {
		const id = await createSeries(db, admin, input());
		await createSeries(db, superadmin, input({ title: 'Suppe', categoryId: cat.Kochen }));
		const [first] = await occurrences(id);
		await takeShift(db, kim, (await getTaskForAdmin(db, admin, first.id)).shifts[0].id);

		const list = await listSeriesForAdmin(db, admin);
		assert.deepEqual(
			list.map((s) => [s.title, s.state, s.upcoming.length]),
			[['Bar putzen', 'running', 3]]
		);
		assert.deepEqual(
			[list[0].upcoming[0].free, list[0].upcoming[0].total, list[0].upcoming[0].assignees],
			[1, 2, ['Kim']]
		);
		assert.equal((await listSeriesForAdmin(db, superadmin)).length, 2);
		assert.deepEqual(await listSeriesForAdmin(db, otherAdmin), []);
	});
});

// each shift template becomes a real shift row on every occurrence
test('occurrence shifts are real rows', async () => {
	const id = await createSeries(db, admin, input());
	const [first] = await occurrences(id);
	const rows = await db.select().from(shift).where(eq(shift.taskId, first.id));
	assert.equal(rows.length, 2);
});
