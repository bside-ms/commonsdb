import { getSchema, type JSONContent } from '@tiptap/core';
import type { Node, Schema } from '@tiptap/pm/model';
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string';
import { HEADING_LEVELS, isAllowedHref, profiles, type Profile } from './profiles.ts';

export { profiles, isAllowedHref, HEADING_LEVELS, type Profile };

/** A TipTap document as stored in jsonb columns. */
export type RichTextDoc = JSONContent & { type: 'doc' };

/** Upper bound for a stored document, serialised. Generous for prose. */
export const MAX_DOC_BYTES = 100_000;

const schemas = new Map<Profile, Schema>();

/** The ProseMirror schema of a profile, built once per process. */
function schemaFor(profile: Profile): Schema {
	let schema = schemas.get(profile);
	if (!schema) {
		schema = getSchema(profiles[profile]());
		schemas.set(profile, schema);
	}
	return schema;
}

export type ParseResult =
	| { ok: true; doc: RichTextDoc | null }
	| { ok: false; reason: 'json' | 'too_large' | 'schema' | 'link' };

/**
 * Validate an incoming document against a profile. Unknown nodes or
 * marks, wrong nesting and disallowed link protocols are rejected.
 * An empty document comes back as `null`, so "no description" has one
 * representation. Accepts the JSON string a form posts, or an object.
 */
export function parseRichText(profile: Profile, input: unknown): ParseResult {
	if (input === null || input === undefined || input === '') return { ok: true, doc: null };

	let raw = input;
	if (typeof raw === 'string') {
		if (raw.length > MAX_DOC_BYTES) return { ok: false, reason: 'too_large' };
		try {
			raw = JSON.parse(raw);
		} catch {
			return { ok: false, reason: 'json' };
		}
	} else if (JSON.stringify(raw).length > MAX_DOC_BYTES) {
		return { ok: false, reason: 'too_large' };
	}

	let node: Node;
	try {
		node = schemaFor(profile).nodeFromJSON(raw);
		node.check(); // content expressions, allowed marks
	} catch {
		return { ok: false, reason: 'schema' };
	}
	if (node.type.name !== 'doc') return { ok: false, reason: 'schema' };

	// The schema checks structure, not attribute values. Check the ones
	// that matter: link targets and heading levels.
	let problem: 'link' | 'schema' | null = null;
	node.descendants((n) => {
		if (n.type.name === 'heading' && !HEADING_LEVELS.includes(n.attrs.level)) problem = 'schema';
		for (const mark of n.marks) {
			if (mark.type.name === 'link' && !isAllowedHref(mark.attrs.href)) problem = 'link';
		}
		return problem === null;
	});
	if (problem) return { ok: false, reason: problem };

	if (isEmptyNode(node)) return { ok: true, doc: null };
	// Round-trip through the schema: drops unknown attrs, normalises shape.
	return { ok: true, doc: node.toJSON() as RichTextDoc };
}

function isEmptyNode(node: Node) {
	return node.textContent.trim() === '' && node.childCount <= 1;
}

/**
 * Server-side HTML for a stored document. Only nodes and marks of the
 * profile can appear, text is escaped by the renderer, links carry
 * rel/target from the profile. Safe for {@html}.
 */
export function toHtml(profile: Profile, doc: RichTextDoc | null): string {
	if (!doc) return '';
	return renderToHTMLString({ extensions: profiles[profile](), content: doc });
}

/** Plain text, e.g. for search snippets or notification e-mails. */
export function toText(profile: Profile, doc: RichTextDoc | null): string {
	if (!doc) return '';
	const node = schemaFor(profile).nodeFromJSON(doc);
	return node.textBetween(0, node.content.size, '\n\n', ' ');
}
