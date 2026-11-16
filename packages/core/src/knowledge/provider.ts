/**
 * The KnowledgeProvider port (ARCHITECTURE.md): where wiki entries live.
 * Entities link to entries by `{ provider, ref }`; they never own content.
 *
 * Everything a reader needs comes back as sanitised HTML, so the app can
 * show an entry without knowing where it lives: the built-in wiki renders
 * its TipTap JSON, an Outline adapter would render Outline's Markdown and
 * route images through our server.
 */
export type KnowledgeHit = {
	provider: string;
	ref: string;
	title: string;
	/** Short text around the match, plain text with «…» around hits. */
	snippet: string | null;
};

export type KnowledgeEntry = {
	provider: string;
	ref: string;
	title: string;
	/** Sanitised HTML, ready to render. */
	html: string;
	updatedAt: Date;
	/** Where to read it in the app (built-in) or outside (Outline). */
	url: string;
	/** Set when the content is edited somewhere else (Outline). */
	editUrl: string | null;
};

export interface KnowledgeProvider {
	/** Stored in knowledge_link.provider, e.g. 'builtin', 'outline'. */
	readonly id: string;
	search(q: string, limit?: number): Promise<KnowledgeHit[]>;
	/** null when the entry is gone (deleted, no access). */
	get(ref: string): Promise<KnowledgeEntry | null>;
}
