import * as v from 'valibot';
import { parseRichText } from '@commonsdb/richtext';
import { isoDate } from '../tasks/schema.ts';
import { checkbox, optionalText } from '../validation.ts';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const optionalTime = v.pipe(
	v.optional(v.nullable(v.string()), ''),
	v.transform((s) => (s ?? '').trim()),
	v.check((s) => s === '' || TIME.test(s), 'action_time_invalid'),
	v.transform((s) => (s === '' ? null : s))
);

const Description = v.pipe(
	v.optional(v.unknown(), null),
	v.rawTransform(({ dataset, addIssue, NEVER }) => {
		const result = parseRichText('description', dataset.value);
		if (result.ok) return result.doc;
		addIssue({
			message:
				result.reason === 'link' ? 'action_description_link_invalid' : 'action_description_invalid'
		});
		return NEVER;
	})
);

/** Lead ids from checkboxes: missing → [], one → [id], many → [ids]. */
const LeadIds = v.pipe(
	v.optional(v.union([v.string(), v.array(v.string())]), []),
	v.transform((x) => (Array.isArray(x) ? x : [x]).filter(Boolean)),
	v.maxLength(10, 'action_too_many_leads')
);

export const ActionInput = v.pipe(
	v.object({
		title: v.pipe(
			v.string('action_title_required'),
			v.trim(),
			v.nonEmpty('action_title_required'),
			v.maxLength(200, 'action_title_too_long')
		),
		description: Description,
		date: isoDate('action_date_invalid'),
		startsTime: optionalTime,
		endsTime: optionalTime,
		place: optionalText(200, 'action_place_too_long'),
		published: checkbox(),
		leadIds: LeadIds
	}),
	v.check((a) => (a.startsTime === null) === (a.endsTime === null), 'action_time_incomplete')
);
export type ActionInput = v.InferInput<typeof ActionInput>;
