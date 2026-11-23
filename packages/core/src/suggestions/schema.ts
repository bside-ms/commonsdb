import * as v from 'valibot';
import { optionalText } from '../validation.ts';

/** '' or missing → null, otherwise a uuid. */
const optionalId = (code: string) =>
	v.pipe(
		v.optional(v.nullable(v.string()), null),
		v.transform((s) => s?.trim() || null),
		v.nullable(v.pipe(v.string(), v.uuid(code)))
	);

export const SuggestionInput = v.object({
	title: v.pipe(
		v.string('suggestion_title_required'),
		v.trim(),
		v.nonEmpty('suggestion_title_required'),
		v.maxLength(200, 'suggestion_title_too_long')
	),
	body: optionalText(4000, 'suggestion_body_too_long'),
	place: optionalText(200, 'suggestion_place_too_long'),
	categoryId: optionalId('category_not_found'),
	imageId: optionalId('upload_not_found')
});
export type SuggestionInput = v.InferInput<typeof SuggestionInput>;

export const RejectSuggestionInput = v.object({
	note: optionalText(1000, 'suggestion_note_too_long')
});
