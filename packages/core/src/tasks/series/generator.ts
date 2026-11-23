/**
 * Turns a series' periods into occurrences: real task + shift rows with
 * series_id and period_key (ROADMAP, slice 5). Runs inside the caller's
 * transaction:
 *
 * - after a series is created, edited or resumed (service.ts)
 * - after an occurrence is confirmed (confirmation.ts), so "every N days"
 *   and the minimum gap follow the actual completion
 * - once a day on the first task-list load (topUpSeriesDaily), until a
 *   worker process exists
 *
 * Idempotent: a period key is never used twice per series (unique index),
 * also not after an admin deleted that occurrence.
 */
import { and, eq, exists, isNotNull, isNull, ne, notExists, sql } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { shift, task, taskSeries, type TaskSeries } from '@commonsdb/db/schema';
import { localToday } from '../shifts.ts';
import { nextPeriods, type Period } from './rule.ts';
import { copyLinks, deleteLinks } from '../../knowledge/index.ts';

/** A db or a transaction. */
export type Executor = Pick<Db, 'select' | 'insert' | 'update' | 'delete'>;

/** Where the space is: "the day it was done" is a local calendar day. */
const TIME_ZONE = 'Europe/Berlin';

/** The occurrence's last day: ends_on for ranges, starts_on for dates. */
const lastDay = sql`coalesce(${task.endsOn}, ${task.startsOn})`;

/** Some shift of this task matches. */
const anyShift = (db: Executor, where: ReturnType<typeof and>) =>
	db
		.select({ one: sql`1` })
		.from(shift)
		.where(and(eq(shift.taskId, task.id), where));

/**
 * Generated, never taken, not edited, not over: what a rule change, a
 * pause or a new completion may replace. Taken, edited and hand-added
 * occurrences always stay.
 */
const untouched = (db: Executor, seriesId: string, today: string) =>
	and(
		eq(task.seriesId, seriesId),
		isNotNull(task.periodKey),
		eq(task.seriesEdited, false),
		isNull(task.deletedAt),
		sql`${lastDay} >= ${today}`,
		notExists(anyShift(db, isNotNull(shift.assigneeId)))
	);

/** Live, not over, and not every shift confirmed yet: occurrences still to be done. */
const pending = (db: Executor, seriesId: string, today: string) =>
	and(
		eq(task.seriesId, seriesId),
		isNull(task.deletedAt),
		sql`${lastDay} >= ${today}`,
		exists(anyShift(db, ne(shift.status, 'confirmed')))
	);

/** Remove the occurrences a new plan replaces. Hard delete: nobody ever had them. */
export async function withdrawUntouched(db: Executor, seriesId: string, today: string) {
	const gone = await db
		.delete(task)
		.where(untouched(db, seriesId, today))
		.returning({ id: task.id });
	await deleteLinks(
		db,
		'task',
		gone.map((t) => t.id)
	);
	return gone.length;
}

/**
 * Day the latest confirmed shift of the series was reported: when the
 * work was done, not when an admin got round to confirming it (decision A).
 */
export async function lastDoneOf(db: Executor, seriesId: string): Promise<string | null> {
	const [r] = await db
		.select({
			day: sql<string | null>`max((${shift.reportedAt} at time zone ${TIME_ZONE})::date)::text`
		})
		.from(shift)
		.innerJoin(task, eq(shift.taskId, task.id))
		.where(and(eq(task.seriesId, seriesId), eq(shift.status, 'confirmed')));
	return r?.day ?? null;
}

/**
 * How many occurrences to keep ready. "Every N days" keeps one: the next
 * depends on when the current one gets done (decision B).
 */
const targetOf = (s: TaskSeries) => (s.rule.repeat === 'every_n_days' ? 1 : s.lookahead);

/** One occurrence from the series' template; null if the period already has one. */
export async function insertOccurrence(
	db: Executor,
	s: TaskSeries,
	when: { whenKind: Period['whenKind']; startsOn: string; endsOn: string | null },
	periodKey: string | null
): Promise<string | null> {
	const [t] = await db
		.insert(task)
		.values({
			categoryId: s.categoryId,
			title: s.title,
			description: s.description,
			urgent: s.urgent,
			selfService: s.selfService,
			place: s.place,
			contact: s.contact,
			bring: s.bring,
			physicalDemands: s.physicalDemands,
			// shared, not copied: one upload for the whole series
			imageId: s.imageId,
			imageAlt: s.imageAlt,
			whenKind: when.whenKind,
			startsOn: when.startsOn,
			endsOn: when.endsOn,
			createdBy: s.createdBy,
			seriesId: s.id,
			periodKey
		})
		// a concurrent run filled this period first
		.onConflictDoNothing()
		.returning({ id: task.id });
	if (!t) return null;
	await db.insert(shift).values(
		s.shiftTemplates.map((tpl, position) => ({
			taskId: t.id,
			position,
			startsTime: tpl.startsTime,
			endsTime: tpl.endsTime,
			endsNextDay: tpl.endsNextDay,
			hoursTenths: tpl.hoursTenths
		}))
	);
	await copyLinks(db, { type: 'series', id: s.id }, { type: 'task', id: t.id });
	return t.id;
}

/**
 * Bring a series up to its target of pending occurrences. With `replan`,
 * untouched future occurrences are withdrawn first, so they come back
 * under the current rule, template and last completion. Returns how many
 * were created. Paused, ended and deleted series get none.
 */
export async function generateOccurrences(
	db: Executor,
	seriesId: string,
	{ today = localToday(), replan = false }: { today?: string; replan?: boolean } = {}
): Promise<number> {
	// lock the series row: two generators for one series take turns
	const [s] = await db.select().from(taskSeries).where(eq(taskSeries.id, seriesId)).for('update');
	if (!s) return 0;
	if (replan || s.deletedAt || s.pausedAt) await withdrawUntouched(db, s.id, today);
	if (s.deletedAt || s.pausedAt || s.rule.repeat === 'manual') return 0;

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(task)
		.where(pending(db, s.id, today));
	const need = targetOf(s) - count;
	if (need <= 0) return 0;

	const used = new Set(
		(
			await db
				.select({ key: task.periodKey })
				.from(task)
				.where(and(eq(task.seriesId, s.id), isNotNull(task.periodKey)))
		).map((r) => r.key)
	);
	const periods = nextPeriods(
		{ rule: s.rule, anchor: s.anchor, until: s.until, minGapDays: s.minGapDays },
		{ today, lastDone: await lastDoneOf(db, s.id), count: need + used.size }
	)
		.filter((p) => !used.has(p.key))
		.slice(0, need);

	let created = 0;
	for (const p of periods) {
		if (await insertOccurrence(db, s, p, p.key)) created++;
	}
	return created;
}

/**
 * Called by confirmShift inside its transaction. A completion only moves
 * future dates for "every N days" and for a minimum gap; otherwise the
 * confirmed occurrence just stops counting as pending, so top up.
 */
export async function afterOccurrenceConfirmed(
	db: Executor,
	taskId: string,
	{ today = localToday() }: { today?: string } = {}
) {
	const [r] = await db
		.select({ seriesId: task.seriesId, rule: taskSeries.rule, minGapDays: taskSeries.minGapDays })
		.from(task)
		.innerJoin(taskSeries, eq(task.seriesId, taskSeries.id))
		.where(eq(task.id, taskId));
	if (!r?.seriesId) return;
	const replan = r.rule.repeat === 'every_n_days' || r.minGapDays > 0;
	await generateOccurrences(db, r.seriesId, { today, replan });
}

/** Every running series, each in its own transaction. Returns how many occurrences were created. */
export async function topUpAllSeries(db: Db, { today = localToday() }: { today?: string } = {}) {
	const ids = await db
		.select({ id: taskSeries.id })
		.from(taskSeries)
		.where(and(isNull(taskSeries.deletedAt), isNull(taskSeries.pausedAt)));
	let created = 0;
	for (const { id } of ids) {
		created += await db.transaction((tx) => generateOccurrences(tx, id, { today }));
	}
	return created;
}

/** Day of the last top-up in this process. */
let lastTopUp: string | null = null;

/**
 * Top up once per day and process: call it where task lists load. Cheap
 * after the first call of the day. Replaced by a nightly job once the
 * worker process exists (ARCHITECTURE, "Open / next").
 */
export async function topUpSeriesDaily(db: Db, today = localToday()) {
	if (lastTopUp === today) return;
	lastTopUp = today;
	try {
		await topUpAllSeries(db, { today });
	} catch (e) {
		lastTopUp = null; // try again on the next load
		throw e;
	}
}
