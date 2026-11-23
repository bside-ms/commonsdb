import * as v from 'valibot';
import { parseRichText } from '@commonsdb/richtext';
import { isoDate } from '../tasks/schema.ts';
import { checkbox } from '../validation.ts';

/** How many unpinned posts the start page shows. */
export const NEWS_ON_START = 3;

const Title = v.pipe(
	v.string('news_title_required'),
	v.trim(),
	v.nonEmpty('news_title_required'),
	v.maxLength(200, 'news_title_too_long')
);

/** TipTap JSON (string from a form, or object), profile 'news'. Required. */
const Body = v.pipe(
	v.optional(v.unknown(), null),
	v.rawTransform(({ dataset, addIssue, NEVER }) => {
		const result = parseRichText('news', dataset.value);
		if (result.ok && result.doc) return result.doc;
		addIssue({
			message: result.ok
				? 'news_body_required'
				: result.reason === 'link'
					? 'news_body_link_invalid'
					: result.reason === 'too_large'
						? 'news_body_too_long'
						: 'news_body_invalid'
		});
		return NEVER;
	})
);

/** 'YYYY-MM-DD' or '' / missing → null. */
const OptionalDay = v.pipe(
	v.optional(v.nullable(v.string()), null),
	v.transform((s) => s?.trim() || null),
	v.nullable(isoDate('news_visible_until_invalid'))
);

export const NewsInput = v.object({
	title: Title,
	body: Body,
	pinned: checkbox(),
	/** Unticked = draft. Publishing keeps the first publication date. */
	published: checkbox(),
	visibleUntil: OptionalDay
});
export type NewsInput = v.InferInput<typeof NewsInput>;
