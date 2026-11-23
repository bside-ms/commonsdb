/**
 * Recurring series for admins: create, edit, pause, end, delete, add an
 * occurrence by hand, and the health view. Members never see a series;
 * its occurrences are ordinary tasks (ROADMAP, slice 5).
 *
 * Scope: like tasks, a series belongs to a category, and admins manage
 * the series of their categories.
 */
import * as v from 'valibot';
import { and, asc, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import {
	category,
	profile,
	shift,
	task,
	taskSeries,
	type ShiftStatus,
	type ShiftTemplateJson,
	type WhenKind
} from '@commonsdb/db/schema';
import { DomainError, ValidationError } from '../../errors.ts';
import type { Actor } from '../../roles.ts';
import { parse } from '../../validation.ts';
import { assertManagesCategory, manageableCategories } from '../policy.ts';
import { assertUsableImage } from '../images.ts';
import { byWindow, hhmm, localToday } from '../shifts.ts';
import type { TaskData } from '../schema.ts';
import {
	generateOccurrences,
	insertOccurrence,
	lastDoneOf,
	withdrawUntouched
} from './generator.ts';
import { nextPeriods, type Period, type SeriesRule } from './rule.ts';
import {
	EndSeriesInput,
	OccurrenceInput,
	SeriesInput,
	SeriesTimingInput,
	type SeriesData
} from './schema.ts';
import { type LinkView, listLinks, setLinks } from '../../knowledge/index.ts';

type Today = { today?: string };

// ---- read models ----------------------------------------------------------------

/** One upcoming occurrence in the health view. */
export type SeriesOccurrence = {
	taskId: string;
	whenKind: WhenKind;
	startsOn: string;
	endsOn: string | null;
	/** Added by hand, not by the rule. */
	manual: boolean;
	/** Edited on its own; rule changes leave it alone. */
	edited: boolean;
	total: number;
	free: number;
	/** Display names of the people holding its shifts. */
	assignees: string[];
};

export type SeriesState = 'running' | 'paused' | 'ended';

export type AdminSeriesListItem = {
	id: string;
	title: string;
	category: { id: string; name: string };
	rule: SeriesRule;
	anchor: string;
	until: string | null;
	state: SeriesState;
	upcoming: SeriesOccurrence[];
};

/** The series as the edit form needs it. */
export type AdminSeries = Pick<
	TaskData,
	| 'title'
	| 'categoryId'
	| 'description'
	| 'urgent'
	| 'selfService'
	| 'place'
	| 'contact'
	| 'bring'
	| 'physicalDemands'
	| 'imageId'
	| 'imageAlt'
> & {
	id: string;
	shiftTemplates: ShiftTemplateJson[];
	rule: SeriesRule;
	anchor: string;
	until: string | null;
	minGapDays: number;
	lookahead: number;
	state: SeriesState;
	upcoming: SeriesOccurrence[];
	links: LinkView[];
};

const stateOf = (s: { pausedAt: Date | null; until: string | null }, today: string): SeriesState =>
	s.pausedAt ? 'paused' : s.until !== null && s.until < today ? 'ended' : 'running';

/** Live occurrences that aren't over yet, per series, by date. */
async function upcomingOf(
	db: Db,
	seriesIds: string[],
	today: string
): Promise<Map<string, SeriesOccurrence[]>> {
	const out = new Map<string, SeriesOccurrence[]>();
	if (seriesIds.length === 0) return out;

	const rows = await db
		.select({
			seriesId: task.seriesId,
			taskId: task.id,
			whenKind: task.whenKind,
			startsOn: task.startsOn,
			endsOn: task.endsOn,
			periodKey: task.periodKey,
			edited: task.seriesEdited,
			status: shift.status,
			assigneeName: profile.displayName
		})
		.from(task)
		.innerJoin(shift, eq(shift.taskId, task.id))
		.leftJoin(profile, eq(profile.userId, shift.assigneeId))
		.where(
			and(
				inArray(task.seriesId, seriesIds),
				isNull(task.deletedAt),
				sql`coalesce(${task.endsOn}, ${task.startsOn}) >= ${today}`
			)
		)
		.orderBy(asc(task.startsOn), asc(task.id), asc(shift.position));

	const byTask = new Map<string, SeriesOccurrence & { seriesId: string }>();
	for (const r of rows) {
		const o = byTask.get(r.taskId) ?? {
			seriesId: r.seriesId!,
			taskId: r.taskId,
			whenKind: r.whenKind,
			startsOn: r.startsOn,
			endsOn: r.endsOn,
			manual: r.periodKey === null,
			edited: r.edited,
			total: 0,
			free: 0,
			assignees: []
		};
		o.total++;
		if ((r.status as ShiftStatus) === 'open') o.free++;
		if (r.assigneeName) o.assignees.push(r.assigneeName);
		byTask.set(r.taskId, o);
	}
	for (const { seriesId, ...o } of byTask.values()) {
		out.set(seriesId, [...(out.get(seriesId) ?? []), o]);
	}
	return out;
}

/** Series in the categories the admin manages, by title. */
export async function listSeriesForAdmin(
	db: Db,
	actor: Actor,
	{ today = localToday() }: Today = {}
): Promise<AdminSeriesListItem[]> {
	const scope = await manageableCategories(db, actor);
	if (scope !== 'all' && scope.length === 0) return [];

	const where: SQL[] = [isNull(taskSeries.deletedAt)];
	if (scope !== 'all') where.push(inArray(taskSeries.categoryId, scope));

	const rows = await db
		.select({
			id: taskSeries.id,
			title: taskSeries.title,
			rule: taskSeries.rule,
			anchor: taskSeries.anchor,
			until: taskSeries.until,
			pausedAt: taskSeries.pausedAt,
			categoryId: category.id,
			categoryName: category.name
		})
		.from(taskSeries)
		.innerJoin(category, eq(taskSeries.categoryId, category.id))
		.where(and(...where))
		.orderBy(asc(taskSeries.title));

	const upcoming = await upcomingOf(
		db,
		rows.map((r) => r.id),
		today
	);
	return rows.map((r) => ({
		id: r.id,
		title: r.title,
		category: { id: r.categoryId, name: r.categoryName },
		rule: r.rule,
		anchor: r.anchor,
		until: r.until,
		state: stateOf(r, today),
		upcoming: upcoming.get(r.id) ?? []
	}));
}

/** A live series the actor manages, or the matching error. */
async function loadSeries(db: Db, actor: Actor, seriesId: string) {
	const s = await db.query.taskSeries.findFirst({
		where: and(eq(taskSeries.id, seriesId), isNull(taskSeries.deletedAt))
	});
	if (!s) throw new DomainError('series_not_found');
	await assertManagesCategory(db, actor, s.categoryId);
	return s;
}

export async function getSeriesForAdmin(
	db: Db,
	actor: Actor,
	seriesId: string,
	{ today = localToday() }: Today = {}
): Promise<AdminSeries> {
	const s = await loadSeries(db, actor, seriesId);
	return {
		id: s.id,
		title: s.title,
		categoryId: s.categoryId,
		description: s.description,
		urgent: s.urgent,
		selfService: s.selfService,
		place: s.place,
		contact: s.contact,
		bring: s.bring,
		physicalDemands: s.physicalDemands,
		imageId: s.imageId,
		imageAlt: s.imageAlt,
		// display order, like a task's shifts
		shiftTemplates: [...s.shiftTemplates]
			.map((t) => ({ ...t, startsTime: hhmm(t.startsTime), endsTime: hhmm(t.endsTime) }))
			.sort(byWindow),
		rule: s.rule,
		anchor: s.anchor,
		until: s.until,
		minGapDays: s.minGapDays,
		lookahead: s.lookahead,
		state: stateOf(s, today),
		upcoming: (await upcomingOf(db, [s.id], today)).get(s.id) ?? [],
		links: await listLinks(db, { type: 'series', id: s.id })
	};
}

/**
 * The next dates a rule would give, for the form's preview. Validates only
 * the rule fields; an invalid rule gives no dates (the form shows its
 * errors on submit). Editing a series: its last completion counts.
 */
export async function previewSeries(
	db: Db,
	actor: Actor,
	input: unknown,
	{ seriesId, today = localToday(), count = 3 }: Today & { seriesId?: string; count?: number } = {}
): Promise<Period[]> {
	const result = v.safeParse(SeriesTimingInput, input);
	if (!result.success) return [];
	let lastDone: string | null = null;
	if (seriesId) {
		await loadSeries(db, actor, seriesId); // scope check
		lastDone = await lastDoneOf(db, seriesId);
	}
	return nextPeriods(result.output, { today, lastDone, count });
}

// ---- writes ----------------------------------------------------------------------

const seriesColumns = (d: SeriesData) => ({
	categoryId: d.categoryId,
	title: d.title,
	description: d.description,
	urgent: d.urgent,
	selfService: d.selfService,
	place: d.place,
	contact: d.contact,
	bring: d.bring,
	physicalDemands: d.physicalDemands,
	imageId: d.imageId,
	imageAlt: d.imageAlt,
	shiftTemplates: d.shiftTemplates,
	rule: d.rule,
	anchor: d.anchor,
	until: d.until,
	minGapDays: d.minGapDays,
	lookahead: d.lookahead
});

/** New series; its first occurrences are generated right away. Returns the id. */
export async function createSeries(
	db: Db,
	actor: Actor,
	input: unknown,
	{ today = localToday() }: Today = {}
): Promise<string> {
	const data = parse(SeriesInput, input);
	await assertManagesCategory(db, actor, data.categoryId);
	await assertUsableImage(db, actor, data.imageId);
	return db.transaction(async (tx) => {
		const [s] = await tx
			.insert(taskSeries)
			.values({ ...seriesColumns(data), createdBy: actor.id })
			.returning({ id: taskSeries.id });
		// links first: new occurrences copy them
		await setLinks(tx, { type: 'series', id: s.id }, data.links);
		await generateOccurrences(tx, s.id, { today });
		return s.id;
	});
}

/**
 * Edit rule and template. Untouched future occurrences are replaced by
 * the new plan; taken, edited and hand-added ones stay as they are.
 */
export async function updateSeries(
	db: Db,
	actor: Actor,
	seriesId: string,
	input: unknown,
	{ today = localToday() }: Today = {}
) {
	const data = parse(SeriesInput, input);
	const current = await loadSeries(db, actor, seriesId);
	if (data.categoryId !== current.categoryId) {
		await assertManagesCategory(db, actor, data.categoryId);
	}
	await assertUsableImage(db, actor, data.imageId, current.imageId);
	await db.transaction(async (tx) => {
		await tx.update(taskSeries).set(seriesColumns(data)).where(eq(taskSeries.id, seriesId));
		await setLinks(tx, { type: 'series', id: seriesId }, data.links);
		await generateOccurrences(tx, seriesId, { today, replan: true });
	});
}

/** Pause: no new occurrences; free future ones are withdrawn, taken ones stay. */
export async function pauseSeries(
	db: Db,
	actor: Actor,
	seriesId: string,
	{ today = localToday() }: Today = {}
) {
	await loadSeries(db, actor, seriesId);
	await db.transaction(async (tx) => {
		await tx.update(taskSeries).set({ pausedAt: new Date() }).where(eq(taskSeries.id, seriesId));
		await withdrawUntouched(tx, seriesId, today);
	});
}

export async function resumeSeries(
	db: Db,
	actor: Actor,
	seriesId: string,
	{ today = localToday() }: Today = {}
) {
	await loadSeries(db, actor, seriesId);
	await db.transaction(async (tx) => {
		await tx.update(taskSeries).set({ pausedAt: null }).where(eq(taskSeries.id, seriesId));
		await generateOccurrences(tx, seriesId, { today, replan: true });
	});
}

/** End on a day: nothing after it. Free occurrences after it are withdrawn. */
export async function endSeries(
	db: Db,
	actor: Actor,
	seriesId: string,
	input: unknown,
	{ today = localToday() }: Today = {}
) {
	const { until } = parse(EndSeriesInput, input);
	const s = await loadSeries(db, actor, seriesId);
	if (until < s.anchor) throw new ValidationError({ until: 'series_until_before_anchor' });
	await db.transaction(async (tx) => {
		await tx.update(taskSeries).set({ until }).where(eq(taskSeries.id, seriesId));
		await generateOccurrences(tx, seriesId, { today, replan: true });
	});
}

/** Soft delete. Free future occurrences go with it; taken and past ones stay. */
export async function deleteSeries(
	db: Db,
	actor: Actor,
	seriesId: string,
	{ today = localToday() }: Today = {}
) {
	await loadSeries(db, actor, seriesId);
	await db.transaction(async (tx) => {
		await tx.update(taskSeries).set({ deletedAt: new Date() }).where(eq(taskSeries.id, seriesId));
		await withdrawUntouched(tx, seriesId, today);
	});
}

/**
 * An occurrence on a date of the admin's choosing, from the template. The
 * only way for 'manual' series; for the others an extra one. A hand-added
 * occurrence is never withdrawn by a rule change. Returns the task id.
 */
export async function addOccurrence(db: Db, actor: Actor, seriesId: string, input: unknown) {
	const { startsOn, endsOn } = parse(OccurrenceInput, input);
	const s = await loadSeries(db, actor, seriesId);
	return db.transaction(async (tx) => {
		const id = await insertOccurrence(
			tx,
			s,
			{ whenKind: endsOn === null ? 'date' : 'range', startsOn, endsOn },
			null
		);
		return id!; // no period key, so no conflict
	});
}
