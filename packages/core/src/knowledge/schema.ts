import * as v from 'valibot';
import { parseRichText } from '@commonsdb/richtext';

/** Top level + two below. */
export const WIKI_MAX_DEPTH = 3;

const Title = v.pipe(
	v.string('wiki_title_required'),
	v.trim(),
	v.nonEmpty('wiki_title_required'),
	v.maxLength(200, 'wiki_title_too_long')
);

/** TipTap JSON (string from a form, or object), profile 'wiki'; empty → null. */
const Content = v.pipe(
	v.optional(v.unknown(), null),
	v.rawTransform(({ dataset, addIssue, NEVER }) => {
		const result = parseRichText('wiki', dataset.value);
		if (result.ok) return result.doc;
		addIssue({
			message:
				result.reason === 'link'
					? 'wiki_content_link_invalid'
					: result.reason === 'too_large'
						? 'wiki_content_too_long'
						: 'wiki_content_invalid'
		});
		return NEVER;
	})
);

/** '' or missing → null, otherwise a uuid. */
const optionalId = (code: string) =>
	v.pipe(
		v.optional(v.nullable(v.string()), null),
		v.transform((s) => s?.trim() || null),
		v.nullable(v.pipe(v.string(), v.uuid(code)))
	);

export const CreatePageInput = v.object({
	title: Title,
	content: Content,
	parentId: optionalId('wiki_parent_not_found')
});

/** `baseRevisionId`: the revision the editor started from (conflict check). */
export const UpdatePageInput = v.object({
	title: Title,
	content: Content,
	baseRevisionId: v.pipe(v.string('wiki_page_conflict'), v.uuid('wiki_page_conflict'))
});

export const MovePageInput = v.object({
	parentId: optionalId('wiki_parent_not_found'),
	position: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 0)
});
