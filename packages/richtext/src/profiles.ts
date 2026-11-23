import type { Extensions } from '@tiptap/core';
import StarterKit, { type StarterKitOptions } from '@tiptap/starter-kit';

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

/** Same link behaviour everywhere: typed URLs become links, new tab, no referrer. */
const link: StarterKitOptions['link'] = {
	openOnClick: false,
	autolink: true,
	defaultProtocol: 'https',
	protocols: ['mailto', 'tel'],
	isAllowedUri: (url) => isAllowedHref(url),
	HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' }
};

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
			link
		})
	],
	/**
	 * Chat messages, modelled on Signal/Telegram: bold, italic, strike,
	 * inline code, code block, links, lists. No headings, quotes or rules.
	 */
	message: (): Extensions => [
		StarterKit.configure({
			heading: false,
			blockquote: false,
			horizontalRule: false,
			underline: false,
			link
		})
	],
	/**
	 * News on the start page (slice 7): short and calm. Bold, italic,
	 * links and lists; no headings (the post title is the heading), no
	 * quotes, code, strike or rules.
	 */
	news: (): Extensions => [
		StarterKit.configure({
			heading: false,
			blockquote: false,
			code: false,
			codeBlock: false,
			horizontalRule: false,
			strike: false,
			underline: false,
			link
		})
	],
	/**
	 * Wiki pages: everything the description has, plus quotes, code,
	 * strike and rules. The page title is the h1. No images yet: media
	 * need uploads (ROADMAP slice 6b, "later").
	 */
	wiki: (): Extensions => [
		StarterKit.configure({
			heading: { levels: [...HEADING_LEVELS] },
			underline: false,
			link
		})
	]
} satisfies Record<string, () => Extensions>;

export type Profile = keyof typeof profiles;
