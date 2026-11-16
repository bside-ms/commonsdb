/**
 * The series form, validated. Forms post flat fields (repeat, weekday,
 * fromDay ..., all strings); core checks them and builds the SeriesRule.
 * Only the fields the chosen repeat mode needs are read, so a form can
 * keep all inputs and just hide the irrelevant ones.
 */
import * as v from 'valibot';
import { REPEAT_MODES, WHEN_KINDS, type Weekday } from '@commonsdb/db/schema';
import { isoDate, pathTo, templateFields } from '../schema.ts';
import type { SeriesRule } from './rule.ts';

/** Whole number from a form field ("3") or code (3); '' and missing → undefined. */
const optionalInt = v.pipe(
	v.optional(v.nullable(v.union([v.number(), v.string()])), ''),
	v.transform((x) => (x === null || x === '' ? undefined : Number(x)))
);

const MONTH_MODES = ['nth', 'day'] as const;

/** The rule's form fields: everything but the template. */
const ruleFields = {
	repeat: v.picklist(REPEAT_MODES, 'series_repeat_invalid'),
	/** date: one day per period; range: a window (every_n_days is always a range). */
	whenKind: v.optional(v.picklist(WHEN_KINDS, 'task_when_kind_invalid'), 'date'),
	monthMode: v.optional(v.picklist(MONTH_MODES, 'series_month_mode_invalid'), 'nth'),
	weekday: optionalInt,
	fromWeekday: optionalInt,
	toWeekday: optionalInt,
	nth: optionalInt,
	day: optionalInt,
	fromDay: optionalInt,
	toDay: optionalInt,
	days: optionalInt,
	anchor: isoDate('series_anchor_invalid'),
	until: v.pipe(
		v.optional(v.nullable(v.string()), ''),
		v.transform((s) => (s ?? '').trim() || null),
		v.nullable(isoDate('series_until_invalid'))
	),
	minGapDays: optionalInt,
	lookahead: optionalInt
};

type RuleFieldsOut = v.InferOutput<v.ObjectSchema<typeof ruleFields, undefined>>;

export type SeriesTimingData = {
	rule: SeriesRule;
	anchor: string;
	until: string | null;
	minGapDays: number;
	lookahead: number;
};

/**
 * Build the rule from the flat fields, with one issue per bad field.
 * Returns null if any field was wrong.
 */
function toTiming(
	input: RuleFieldsOut,
	addIssue: (issue: { message: string; path: [v.ObjectPathItem] }) => void
): SeriesTimingData | null {
	let ok = true;
	/** The field as a whole number in [lo, hi], or an issue on it. */
	const int = (key: keyof RuleFieldsOut, lo: number, hi: number, code: string) => {
		const n = input[key];
		if (typeof n !== 'number' || !Number.isInteger(n) || n < lo || n > hi) {
			addIssue({ message: code, path: pathTo(input, key) });
			ok = false;
			return lo;
		}
		return n;
	};
	const weekday = (key: keyof RuleFieldsOut) => int(key, 0, 6, 'series_weekday_invalid') as Weekday;

	let rule: SeriesRule;
	const range = input.whenKind === 'range';
	switch (input.repeat) {
		case 'weekly':
		case 'biweekly':
			if (range) {
				const from = weekday('fromWeekday');
				const to = weekday('toWeekday');
				rule = { repeat: input.repeat, fromWeekday: from, toWeekday: to };
				if (ok && to < from) {
					addIssue({ message: 'series_window_reversed', path: pathTo(input, 'toWeekday') });
					ok = false;
				}
			} else {
				rule = { repeat: input.repeat, weekday: weekday('weekday') };
			}
			break;
		case 'monthly':
			if (range) {
				const from = int('fromDay', 1, 31, 'series_day_invalid');
				const to = int('toDay', 1, 31, 'series_day_invalid');
				rule = { repeat: 'monthly', fromDay: from, toDay: to };
				if (ok && to < from) {
					addIssue({ message: 'series_window_reversed', path: pathTo(input, 'toDay') });
					ok = false;
				}
			} else if (input.monthMode === 'day') {
				rule = { repeat: 'monthly', day: int('day', 1, 31, 'series_day_invalid') };
			} else {
				rule = {
					repeat: 'monthly',
					nth: int('nth', 1, 5, 'series_nth_invalid') as 1 | 2 | 3 | 4 | 5,
					weekday: weekday('weekday')
				};
			}
			break;
		case 'every_n_days':
			rule = { repeat: 'every_n_days', days: int('days', 1, 365, 'series_days_invalid') };
			break;
		case 'manual':
			rule = { repeat: 'manual' };
			break;
	}

	const minGapDays =
		input.minGapDays === undefined ? 0 : int('minGapDays', 0, 365, 'series_min_gap_invalid');
	const lookahead =
		input.lookahead === undefined ? 3 : int('lookahead', 1, 12, 'series_lookahead_invalid');
	if (input.until !== null && input.until < input.anchor) {
		addIssue({ message: 'series_until_before_anchor', path: pathTo(input, 'until') });
		ok = false;
	}
	return ok ? { rule, anchor: input.anchor, until: input.until, minGapDays, lookahead } : null;
}

/** Only the rule and its timing: for the form's preview of the next dates. */
export const SeriesTimingInput = v.pipe(
	v.object(ruleFields),
	v.rawTransform(({ dataset, addIssue, NEVER }) => toTiming(dataset.value, addIssue) ?? NEVER)
);

export const SeriesInput = v.pipe(
	v.object({ ...templateFields, ...ruleFields }),
	v.rawTransform(({ dataset, addIssue, NEVER }) => {
		const input = dataset.value;
		const timing = toTiming(input, addIssue);
		if (!timing) return NEVER;
		return {
			title: input.title,
			categoryId: input.categoryId,
			description: input.description,
			urgent: input.urgent,
			selfService: input.selfService,
			place: input.place,
			contact: input.contact,
			bring: input.bring,
			physicalDemands: input.physicalDemands,
			shiftTemplates: input.shifts.map(({ id: _, ...t }) => t),
			...timing
		};
	})
);
export type SeriesInput = v.InferInput<typeof SeriesInput>;
export type SeriesData = v.InferOutput<typeof SeriesInput>;

/** End a series: the last day occurrences may fall on. */
export const EndSeriesInput = v.object({ until: isoDate('series_until_invalid') });

/** An occurrence added by hand (any repeat mode; the only way for 'manual'). */
export const OccurrenceInput = v.pipe(
	v.object({
		startsOn: isoDate('task_starts_on_invalid'),
		endsOn: v.pipe(
			v.optional(v.nullable(v.string()), ''),
			v.transform((s) => (s ?? '').trim() || null),
			v.nullable(isoDate('task_ends_on_invalid'))
		)
	}),
	v.check((o) => o.endsOn === null || o.endsOn >= o.startsOn, 'task_ends_before_start')
);
