import * as v from 'valibot';
import { parseRichText } from '@commonsdb/richtext';
import { WHEN_KINDS } from '@commonsdb/db/schema';
import { checkbox, optionalText } from '../validation.ts';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isoDate = (code: string) =>
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

export const TaskInput = v.pipe(
	v.object({
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
		whenKind: v.picklist(WHEN_KINDS, 'task_when_kind_invalid'),
		startsOn: isoDate('task_starts_on_invalid'),
		// only read for 'range'; '' from an empty date input is fine for 'date'
		endsOn: v.optional(v.string(), ''),
		hours: HoursInput
	}),
	v.rawTransform(({ dataset, addIssue, NEVER }) => {
		const { endsOn, whenKind, hours, ...rest } = dataset.value;
		if (whenKind === 'date') return { ...rest, whenKind, endsOn: null, hoursTenths: hours };

		const end = endsOn.trim();
		if (!ISO_DATE.test(end) || Number.isNaN(Date.parse(end))) {
			addIssue({ message: 'task_ends_on_invalid', path: pathTo(dataset.value, 'endsOn') });
			return NEVER;
		}
		if (end < rest.startsOn) {
			addIssue({ message: 'task_ends_before_start', path: pathTo(dataset.value, 'endsOn') });
			return NEVER;
		}
		return { ...rest, whenKind, endsOn: end, hoursTenths: hours };
	})
);
export type TaskInput = v.InferInput<typeof TaskInput>;
export type TaskData = v.InferOutput<typeof TaskInput>;

/** Issue path for a cross-field error, so getDotPath yields the field name. */
function pathTo(input: Record<string, unknown>, key: string) {
	return [{ type: 'object', origin: 'value', input, key, value: input[key] }] as unknown as [
		v.ObjectPathItem
	];
}

export const TaskFilter = v.object({
	q: v.pipe(v.optional(v.string(), ''), v.trim(), v.maxLength(100)),
	superCategoryId: v.optional(v.pipe(v.string(), v.uuid())),
	categoryId: v.optional(v.pipe(v.string(), v.uuid()))
});
export type TaskFilter = v.InferInput<typeof TaskFilter>;
