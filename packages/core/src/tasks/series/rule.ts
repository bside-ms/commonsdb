/**
 * When a series' occurrences fall. Pure: no database, no clock (today and
 * the last completion are passed in), so every rule is unit-tested
 * (rule.test.ts). The generator (generator.ts) turns periods into tasks.
 *
 * Dates are calendar days ('YYYY-MM-DD'), like task.starts_on. Arithmetic
 * runs on UTC dates, so no time zone or DST change can shift a day.
 * Weekdays: 0 = Monday ... 6 = Sunday (as in the prototype).
 */
import type { SeriesRuleJson, Weekday, WhenKind } from '@commonsdb/db/schema';

export type { RepeatMode, Weekday } from '@commonsdb/db/schema';

/** The rule as stored in task_series.rule (shapes documented in db's series-json.ts). */
export type SeriesRule = SeriesRuleJson;

/** One occurrence-to-be. `key` is stable per period: the generator never creates a key twice. */
export type Period = {
	key: string;
	whenKind: WhenKind;
	startsOn: string;
	endsOn: string | null;
};

export type SeriesTiming = {
	rule: SeriesRule;
	/** Nothing before this day; also fixes the week parity for 'biweekly'. */
	anchor: string;
	/** Nothing after this day; a range is cut short at it. */
	until: string | null;
	/** Ranges only: start at least this many days after the last completion. */
	minGapDays: number;
};

export type PeriodContext = {
	today: string;
	/** Day the last occurrence was actually done (confirmed), if any. */
	lastDone: string | null;
	/** How many periods to return at most. */
	count: number;
};

/** Ranges are the kinds with a window; everything else is a fixed date. */
export function whenKindOf(rule: SeriesRule): WhenKind {
	return 'fromWeekday' in rule || 'fromDay' in rule || rule.repeat === 'every_n_days'
		? 'range'
		: 'date';
}

// ---- calendar arithmetic (UTC) -----------------------------------------------

const DAY_MS = 86_400_000;

const toDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const toYmd = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (ymd: string, n: number) =>
	toYmd(new Date(toDate(ymd).getTime() + n * DAY_MS));

const weekdayOf = (ymd: string) => ((toDate(ymd).getUTCDay() + 6) % 7) as Weekday;

/** The Monday of that day's week. */
const weekStart = (ymd: string) => addDays(ymd, -weekdayOf(ymd));

const daysBetween = (from: string, to: string) =>
	Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS);

const daysInMonth = (year: number, month: number) =>
	new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

const ymdOf = (year: number, month: number, day: number) =>
	toYmd(new Date(Date.UTC(year, month, day)));

/** The nth weekday of a month; past the month's end (5th) it falls back to the last one. */
function nthWeekday(year: number, month: number, weekday: Weekday, nth: number): string {
	const first = weekdayOf(ymdOf(year, month, 1));
	let day = 1 + ((weekday - first + 7) % 7) + (nth - 1) * 7;
	while (day > daysInMonth(year, month)) day -= 7;
	return ymdOf(year, month, day);
}

const max = (a: string, b: string) => (a > b ? a : b);
const min = (a: string, b: string) => (a < b ? a : b);

// ---- periods ---------------------------------------------------------------------

/** Guard against rules that never produce a period (e.g. a gap longer than every window). */
const MAX_STEPS = 120;

/**
 * The next periods of a series, from today (or the anchor, if later) on,
 * up to `until`. Periods that are already over are skipped; a range that
 * has begun starts today instead. 'manual' has none.
 */
export function nextPeriods(timing: SeriesTiming, ctx: PeriodContext): Period[] {
	const { rule } = timing;
	if (rule.repeat === 'manual' || ctx.count <= 0) return [];
	if (rule.repeat === 'every_n_days') return everyNDays(timing, rule.days, ctx);

	const out: Period[] = [];
	const earliest = max(ctx.today, timing.anchor);
	const gapStart =
		ctx.lastDone && timing.minGapDays > 0 ? addDays(ctx.lastDone, timing.minGapDays) : null;

	/** Clip a candidate to today/anchor, the gap and until. Returns false once past until (stop). */
	const accept = (key: string, from: string, to: string | null): boolean => {
		if (to === null) {
			// fixed date: no clipping, it's either on or off
			if (from < earliest) return true; // not yet: keep looking
			if (timing.until && from > timing.until) return false; // done
			out.push({ key, whenKind: 'date', startsOn: from, endsOn: null });
			return true;
		}
		if (to < earliest) return true;
		let start = max(from, earliest);
		if (gapStart) start = max(start, gapStart);
		if (timing.until && start > timing.until) return false;
		const end = timing.until ? min(to, timing.until) : to;
		if (start <= end) out.push({ key, whenKind: 'range', startsOn: start, endsOn: end });
		return true;
	};

	if (rule.repeat === 'weekly' || rule.repeat === 'biweekly') {
		const step = rule.repeat === 'biweekly' ? 14 : 7;
		const anchorWeek = weekStart(timing.anchor);
		// first period that can still matter, keeping the anchor's parity
		const skip = Math.max(0, Math.floor(daysBetween(anchorWeek, weekStart(earliest)) / step));
		for (let i = 0; i < MAX_STEPS && out.length < ctx.count; i++) {
			const week = addDays(anchorWeek, (skip + i) * step);
			const key = `w:${week}`;
			const goOn =
				'weekday' in rule
					? accept(key, addDays(week, rule.weekday), null)
					: accept(
							key,
							addDays(week, rule.fromWeekday),
							addDays(week, Math.max(rule.fromWeekday, rule.toWeekday))
						);
			if (!goOn) break;
		}
		return out;
	}

	// monthly (TS doesn't narrow the union past the weekly branch's return)
	const monthly = rule as Extract<SeriesRule, { repeat: 'monthly' }>;
	const start = toDate(earliest);
	for (let i = 0; i < MAX_STEPS && out.length < ctx.count; i++) {
		const year = start.getUTCFullYear() + Math.floor((start.getUTCMonth() + i) / 12);
		const month = (start.getUTCMonth() + i) % 12;
		const length = daysInMonth(year, month);
		const key = `m:${ymdOf(year, month, 1).slice(0, 7)}`;
		let goOn: boolean;
		if ('nth' in monthly)
			goOn = accept(key, nthWeekday(year, month, monthly.weekday, monthly.nth), null);
		else if ('day' in monthly)
			goOn = accept(key, ymdOf(year, month, Math.min(monthly.day, length)), null);
		else
			goOn = accept(
				key,
				ymdOf(year, month, Math.min(monthly.fromDay, length)),
				ymdOf(year, month, Math.min(monthly.toDay, length))
			);
		if (!goOn) break;
	}
	return out;
}

/**
 * Every N days from the last actual completion: each window is N days
 * long and starts N days after the previous one was done (or at the
 * anchor before the first completion). Only the first period is really
 * known; the rest assume it gets done on its first day.
 */
function everyNDays(timing: SeriesTiming, days: number, ctx: PeriodContext): Period[] {
	const out: Period[] = [];
	let from = ctx.lastDone ? addDays(ctx.lastDone, days) : timing.anchor;
	from = max(from, max(ctx.today, timing.anchor));
	for (let i = 0; i < ctx.count; i++) {
		if (timing.until && from > timing.until) break;
		let to = addDays(from, Math.max(0, days - 1));
		if (timing.until) to = min(to, timing.until);
		out.push({ key: `d:${from}`, whenKind: 'range', startsOn: from, endsOn: to });
		from = addDays(from, days);
	}
	return out;
}
