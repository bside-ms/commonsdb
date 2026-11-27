import * as v from 'valibot';
import { parseRichText } from '@commonsdb/richtext';
import { WHEN_KINDS } from '@commonsdb/db/schema';
import { checkbox, optionalText } from '../validation.ts';
import { endsNextDay } from './shifts.ts';
import { LinksInput } from '../knowledge/index.ts';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isoDate = (code: string) =>
	v.pipe(v.string(code), v.trim(), v.regex(ISO_DATE, code), v.isoDate(code));

/**
 * Hours as typed by a person ("1,5", "2", 1.5) → integer tenths (15).
 * Half-hour steps, 0.5 to 24.
 */
export const HoursInput = v.pipe(
	v.union([v.number(), v.string()], 'task_hours_invalid'),
	v.transform((x) => (typeof x === 'number' ? x : Number(x.trim().replace(',', '.')))),
	v.number('task_hours_invalid'),
	v.check((h) => Number.isFinite(h), 'task_hours_invalid'),
	v.minValue(0.5, 'task_hours_too_small'),
	v.maxValue(24, 'task_hours_too_large'),
	v.check((h) => Number.isInteger(h * 2), 'task_hours_half_steps'),
	v.transform((h) => Math.round(h * 10))
);

/**
 * Description: a TipTap document in the 'description' profile, or null.
 * Forms post it as a JSON string from the editor's hidden input.
 */
const Description = v.pipe(
	v.optional(v.unknown(), null),
	v.rawTransform(({ dataset, addIssue, NEVER }) => {
		const result = parseRichText('description', dataset.value);
		if (result.ok) return result.doc;
		addIssue({
			message:
				result.reason === 'link' ? 'task_description_link_invalid' : 'task_description_invalid'
		});
		return NEVER;
	})
);

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** '' from an empty time input → null; otherwise 'HH:MM'. */
const optionalTime = v.pipe(
	v.optional(v.nullable(v.string()), ''),
	v.transform((s) => (s ?? '').trim()),
	v.check((s) => s === '' || TIME.test(s), 'shift_time_invalid'),
	v.transform((s) => (s === '' ? null : s))
);

/**
 * One shift on the task form. `id` is set for shifts that already exist
 * (updateTask matches on it), empty for new rows. Times both or neither;
 * an end at or before the start means the next day (22:00–02:00).
 */
export const ShiftInput = v.pipe(
	v.object({
		id: v.pipe(
			v.optional(v.nullable(v.string()), ''),
			v.transform((s) => s || null),
			v.nullable(v.pipe(v.string(), v.uuid('shift_not_found')))
		),
		startsTime: optionalTime,
		endsTime: optionalTime,
		hours: HoursInput
	}),
	v.rawTransform(({ dataset, addIssue, NEVER }) => {
		const { id, startsTime, endsTime, hours } = dataset.value;
		if ((startsTime === null) !== (endsTime === null)) {
			const missing = startsTime === null ? 'startsTime' : 'endsTime';
			addIssue({ message: 'shift_time_incomplete', path: pathTo(dataset.value, missing) });
			return NEVER;
		}
		return {
			id,
			startsTime,
			endsTime,
			endsNextDay: startsTime !== null && endsTime !== null && endsNextDay(startsTime, endsTime),
			hoursTenths: hours
		};
	})
);
export type ShiftData = v.InferOutput<typeof ShiftInput>;

/** At most this many shifts per task: a guard, not a product rule. */
export const MAX_SHIFTS = 30;

/**
 * What a task and a series template share: everything but the when.
 * Spread into TaskInput and SeriesInput (series/schema.ts).
 */
export const templateFields = {
	title: v.pipe(
		v.string('task_title_required'),
		v.trim(),
		v.nonEmpty('task_title_required'),
		v.maxLength(120, 'task_title_too_long')
	),
	categoryId: v.pipe(v.string('task_category_required'), v.uuid('task_category_required')),
	description: Description,
	urgent: checkbox(),
	selfService: checkbox(),
	place: optionalText(200, 'task_place_too_long'),
	contact: optionalText(200, 'task_contact_too_long'),
	bring: optionalText(500, 'task_bring_too_long'),
	physicalDemands: optionalText(500, 'task_physical_demands_too_long'),
	shifts: v.pipe(
		v.array(ShiftInput, 'task_shifts_required'),
		v.minLength(1, 'task_shifts_required'),
		v.maxLength(MAX_SHIFTS, 'task_shifts_too_many')
	),
	/** Wiki pages, as keys 'builtin:<page id>' (knowledge/links.ts). */
	links: LinksInput,
	/**
	 * The upload to show as photo; '' or missing = none. The file itself
	 * never comes through here: the app stores it first (core/uploads) and
	 * posts the id. Who may use which upload: tasks/images.ts.
	 */
	imageId: v.pipe(
		v.optional(v.nullable(v.string()), ''),
		v.transform((s) => s || null),
		v.nullable(v.pipe(v.string(), v.uuid('upload_not_found')))
	),
	imageAlt: optionalText(200, 'task_image_alt_too_long')
};

export const TaskInput = v.pipe(
	v.object({
		...templateFields,
		whenKind: v.picklist(WHEN_KINDS, 'task_when_kind_invalid'),
		startsOn: isoDate('task_starts_on_invalid'),
		// only read for 'range'; '' from an empty date input is fine for 'date'
		endsOn: v.optional(v.string(), '')
	}),
	v.rawTransform(({ dataset, addIssue, NEVER }) => {
		const { endsOn, whenKind, ...rest } = dataset.value;
		if (whenKind === 'date') return { ...rest, whenKind, endsOn: null };

		const end = endsOn.trim();
		if (!ISO_DATE.test(end) || Number.isNaN(Date.parse(end))) {
			addIssue({ message: 'task_ends_on_invalid', path: pathTo(dataset.value, 'endsOn') });
			return NEVER;
		}
		if (end < rest.startsOn) {
			addIssue({ message: 'task_ends_before_start', path: pathTo(dataset.value, 'endsOn') });
			return NEVER;
		}
		return { ...rest, whenKind, endsOn: end };
	})
);
export type TaskInput = v.InferInput<typeof TaskInput>;
export type TaskData = v.InferOutput<typeof TaskInput>;

/** Issue path for a cross-field error, so getDotPath yields the field name. */
export function pathTo(input: Record<string, unknown>, key: string) {
	return [{ type: 'object', origin: 'value', input, key, value: input[key] }] as unknown as [
		v.ObjectPathItem
	];
}

export const TaskFilter = v.object({
	q: v.pipe(v.optional(v.string(), ''), v.trim(), v.maxLength(100)),
	superCategoryId: v.optional(v.pipe(v.string(), v.uuid())),
	categoryId: v.optional(v.pipe(v.string(), v.uuid())),
	/** Only urgent tasks. They always come first anyway. */
	urgent: checkbox(),
	/** Doable now: a free shift and the task is on today. */
	now: checkbox(),
	/** Together only: at least two shifts at the same time. */
	together: checkbox(),
	/** Only tasks marked for this Aktion. */
	actionId: v.optional(v.pipe(v.string(), v.uuid()))
});
export type TaskFilter = v.InferInput<typeof TaskFilter>;

/** Reporting a shift as done. The note is optional. */
export const ReportInput = v.object({
	note: optionalText(1000, 'shift_note_too_long')
});

/** Confirming: the admin may correct the hours; the thanks note is optional. */
export const ConfirmInput = v.object({
	hours: HoursInput,
	note: optionalText(1000, 'shift_note_too_long')
});

/** Sending a report back needs a reason. */
export const SendBackInput = v.object({
	note: v.pipe(
		v.string('shift_send_back_note_required'),
		v.trim(),
		v.nonEmpty('shift_send_back_note_required'),
		v.maxLength(1000, 'shift_note_too_long')
	)
});
