import * as v from 'valibot';
import { parseRichText } from '@commonsdb/richtext';

/** The pages that exist. A new one is a slug here plus its route. */
export const SITE_PAGES = ['about'] as const;
export type SitePageSlug = (typeof SITE_PAGES)[number];

/** TipTap JSON (string from a form, or object), profile 'wiki'; empty → null. */
export const SitePageInput = v.object({
	content: v.pipe(
		v.optional(v.unknown(), null),
		v.rawTransform(({ dataset, addIssue, NEVER }) => {
			const result = parseRichText('wiki', dataset.value);
			if (result.ok) return result.doc;
			addIssue({
				message:
					result.reason === 'link'
						? 'site_page_link_invalid'
						: result.reason === 'too_large'
							? 'site_page_too_long'
							: 'site_page_invalid'
			});
			return NEVER;
		})
	)
});
