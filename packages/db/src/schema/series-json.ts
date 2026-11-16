/**
 * Shapes of the jsonb columns on task_series. Types only: core validates
 * them (tasks/series) and owns what they mean; they live here so the
 * columns are typed without db depending on core (like WhenKind).
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const REPEAT_MODES = ['weekly', 'biweekly', 'monthly', 'every_n_days', 'manual'] as const;
export type RepeatMode = (typeof REPEAT_MODES)[number];

/**
 * When occurrences fall. The shape decides the occurrence's kind: a
 * weekday or a day of the month gives a fixed date, a window a range.
 * Weekdays: 0 = Monday ... 6 = Sunday.
 */
export type SeriesRuleJson =
	/** On one weekday, every week or every other week (counted from the anchor's week). */
	| { repeat: 'weekly' | 'biweekly'; weekday: Weekday }
	/** Some time between two weekdays of that week. */
	| { repeat: 'weekly' | 'biweekly'; fromWeekday: Weekday; toWeekday: Weekday }
	/** The nth weekday of the month; nth 5 = the last one. */
	| { repeat: 'monthly'; nth: 1 | 2 | 3 | 4 | 5; weekday: Weekday }
	/** A day of the month; 31 means the month's last day in shorter months. */
	| { repeat: 'monthly'; day: number }
	/** Some time between two days of the month (clamped to its length). */
	| { repeat: 'monthly'; fromDay: number; toDay: number }
	/** A window of `days` days, starting `days` after the last completion. */
	| { repeat: 'every_n_days'; days: number }
	/** No rule: an admin adds every occurrence by hand. */
	| { repeat: 'manual' };

/** A shift every occurrence gets; same fields as the shift table. */
export type ShiftTemplateJson = {
	startsTime: string | null;
	endsTime: string | null;
	endsNextDay: boolean;
	hoursTenths: number;
};
