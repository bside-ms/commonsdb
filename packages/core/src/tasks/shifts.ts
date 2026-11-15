/**
 * Pure shift arithmetic: time windows, overlaps and the member-list flags
 * from the prototype (together, parallel slots, doable now). No database,
 * so the rules are unit-tested on their own (shifts.test.ts).
 *
 * Times are local times of day ('HH:MM'), like the task's calendar dates.
 * All shifts of a task share the task's day(s), so comparing the windows
 * is enough. No window means "any time": it overlaps everything, as in the
 * prototype (people can arrange to meet).
 */
import type { WhenKind } from '@commonsdb/db/schema';

export type ShiftWindow = {
	startsTime: string | null;
	endsTime: string | null;
	endsNextDay: boolean;
};

const DAY = 24 * 60;

/** 'HH:MM' or Postgres' 'HH:MM:SS' → minutes after midnight. */
export function minutesOf(time: string): number {
	const [h, m] = time.split(':').map(Number);
	return h * 60 + m;
}

/** Postgres returns 'HH:MM:SS'; read models hand out 'HH:MM'. */
export const hhmm = (time: string | null) => (time === null ? null : time.slice(0, 5));

/** A window ends on the next day exactly when its end isn't after its start. */
export const endsNextDay = (startsTime: string, endsTime: string) =>
	minutesOf(endsTime) <= minutesOf(startsTime);

/** [start, end) in minutes; the end may pass midnight (up to 48 h). */
function span(w: ShiftWindow): [number, number] | null {
	if (w.startsTime === null || w.endsTime === null) return null;
	const start = minutesOf(w.startsTime);
	return [start, minutesOf(w.endsTime) + (w.endsNextDay ? DAY : 0)];
}

export function shiftsOverlap(a: ShiftWindow, b: ShiftWindow): boolean {
	const sa = span(a);
	const sb = span(b);
	if (!sa || !sb) return true;
	return sa[0] < sb[1] && sb[0] < sa[1];
}

/** The most shifts of this task that run at the same time (at least 1). */
export function parallelCount(shifts: ShiftWindow[]): number {
	let best = shifts.length > 0 ? 1 : 0;
	for (const s of shifts) {
		best = Math.max(best, shifts.filter((x) => shiftsOverlap(s, x)).length);
	}
	return best;
}

/** Nobody does it alone: at least two shifts overlap. */
export const isTogether = (shifts: ShiftWindow[]) => parallelCount(shifts) >= 2;

/** For people with time right now: a free shift, and the task is on today. */
export function isDoableNow(
	task: { whenKind: WhenKind; startsOn: string; endsOn: string | null },
	freeShifts: number,
	today: string
): boolean {
	if (freeShifts === 0) return false;
	if (task.whenKind === 'date') return task.startsOn === today;
	return task.startsOn <= today && today <= (task.endsOn ?? task.startsOn);
}

/** Today's calendar date where the space is ('YYYY-MM-DD'). */
export function localToday(timeZone = 'Europe/Berlin', now = new Date()): string {
	// en-CA formats as YYYY-MM-DD
	return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

/** Display order: timed shifts by start, untimed ones last; stable otherwise. */
export function byWindow<T extends ShiftWindow>(a: T, b: T): number {
	const sa = a.startsTime === null ? Infinity : minutesOf(a.startsTime);
	const sb = b.startsTime === null ? Infinity : minutesOf(b.startsTime);
	return sa === sb ? 0 : sa < sb ? -1 : 1;
}
