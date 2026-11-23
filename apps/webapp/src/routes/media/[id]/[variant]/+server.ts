/*
 * Serves uploaded files: /media/<upload id>/<variant>, e.g. …/thumb.
 *
 * Behind the login like every page (hooks.server.ts); core decides who may
 * see which upload (openUpload). Nothing is served from a public folder or
 * a bucket URL, so access rules hold whatever the storage is.
 *
 * Caching: `private, no-cache` plus an ETag. The browser keeps the file
 * but asks each time; we answer 304 after checking access again. A photo
 * whose owner switches it to "nobody" therefore disappears for others on
 * their next page view, not in a year.
 */
import { error } from '@sveltejs/kit';
import { DomainError } from '@commonsdb/core';
import { openUpload, type OpenedUpload } from '@commonsdb/core/uploads';
import type { ByteRange } from '@commonsdb/media';
import { db, storage } from '#lib/server/services.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request, locals }) => {
	const actor = locals.actor!; // the hooks guard lets no one through without a session
	const range = parseRange(request.headers.get('range'));

	let file: OpenedUpload;
	try {
		file = await openUpload(db, storage, actor, params.id, params.variant, { range });
	} catch (e) {
		if (e instanceof DomainError) error(404, e.code);
		if (e instanceof RangeError) {
			const whole = await openUpload(db, storage, actor, params.id, params.variant);
			await whole.body.cancel();
			return new Response(null, {
				status: 416,
				headers: { 'content-range': `bytes */${whole.size}` }
			});
		}
		throw e;
	}

	const headers = new Headers({
		'content-type': file.mime,
		'cache-control': 'private, no-cache',
		etag: file.etag,
		'accept-ranges': 'bytes',
		'x-content-type-options': 'nosniff',
		// served files never run anything, even when opened directly
		'content-security-policy': "default-src 'none'; img-src 'self'; media-src 'self'; sandbox",
		'cross-origin-resource-policy': 'same-origin',
		'content-disposition': disposition(file)
	});

	if (request.headers.get('if-none-match') === file.etag) {
		await file.body.cancel();
		return new Response(null, { status: 304, headers });
	}

	if (range) {
		const start = range.start;
		const end = Math.min(range.end ?? file.size - 1, file.size - 1);
		headers.set('content-range', `bytes ${start}-${end}/${file.size}`);
		headers.set('content-length', String(end - start + 1));
		return new Response(file.body, { status: 206, headers });
	}

	headers.set('content-length', String(file.size));
	return new Response(file.body, { headers });
};

/** `bytes=500-` and `bytes=500-999`; anything else (several ranges, suffixes) → the whole file. */
function parseRange(header: string | null): ByteRange | undefined {
	const match = header?.match(/^bytes=(\d+)-(\d*)$/);
	if (!match) return undefined;
	const start = Number(match[1]);
	const end = match[2] ? Number(match[2]) : undefined;
	return end === undefined || end >= start ? { start, end } : undefined;
}

/** Images show in the page; everything else downloads, with its original name. */
function disposition(file: OpenedUpload) {
	if (file.kind === 'image') return 'inline';
	const name = file.originalName ?? 'download';
	return `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;
}
