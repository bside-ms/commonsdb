import { error } from '@sveltejs/kit';
import { DomainError, exportWikiMarkdown } from '@commonsdb/core';
import { db } from '#lib/server/services.ts';
import type { RequestHandler } from './$types';

/** The page as a Markdown file. Signed-in only (hooks.server.ts redirects otherwise). */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.actor) error(401, 'unauthenticated');
	try {
		const { filename, markdown } = await exportWikiMarkdown(db, params.slug);
		return new Response(markdown, {
			headers: {
				'content-type': 'text/markdown; charset=utf-8',
				'content-disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (e) {
		if (e instanceof DomainError) error(404, e.code);
		throw e;
	}
};
