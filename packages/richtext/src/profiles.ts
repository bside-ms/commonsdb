import type { Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

/** Link targets we render. Everything else is rejected on save. */
export const ALLOWED_PROTOCOLS = ['https:', 'http:', 'mailto:', 'tel:'] as const;

export function isAllowedHref(href: unknown): href is string {
	if (typeof href !== 'string' || href.length > 2000) return false;
	try {
		return (ALLOWED_PROTOCOLS as readonly string[]).includes(new URL(href).protocol);
	} catch {
		return false;
	}
}

/** h1 is the page title, so documents start at h2. */
export const HEADING_LEVELS = [2, 3] as const;

/**
 * Extensions per use. The editor, the server-side validation and the HTML
 * renderer all read the same list, so "what can be typed" and "what is
 * accepted and shown" can't drift apart.
 *
 * A function, not a constant: TipTap extensions carry per-editor state,
 * so every editor (and the server) gets fresh instances.
 */
export const profiles = {
	/** Task descriptions (later also resources, qualifications). */
	description: (): Extensions => [
		StarterKit.configure({
			heading: { levels: [...HEADING_LEVELS] },
			blockquote: false,
			code: false,
			codeBlock: false,
			horizontalRule: false,
			strike: false,
			underline: false,
			link: {
				openOnClick: false,
				autolink: true,
				defaultProtocol: 'https',
				protocols: ['mailto', 'tel'],
				isAllowedUri: (url) => isAllowedHref(url),
				HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' }
			}
		})
	]
} satisfies Record<string, () => Extensions>;

export type Profile = keyof typeof profiles;
