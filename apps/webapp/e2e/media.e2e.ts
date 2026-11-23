/**
 * /media against the production build: access, headers, caching, ranges,
 * and that what we serve carries no metadata. The upload is stored through
 * the real pipeline (core + disk storage) directly, so this test doesn't
 * depend on any upload form.
 */
import { readFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { storeUpload } from '@commonsdb/core/uploads';
import { createDb, schema } from '@commonsdb/db';
import { createDiskStorage } from '@commonsdb/media';
import { test as base } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { TEST_ENV } from './env.ts';
import { USERS } from './users.ts';

const PHOTO = readFileSync(new URL('./files/photo-with-gps.jpg', import.meta.url));
const has = (bytes: Uint8Array, text: string) => Buffer.from(bytes).includes(Buffer.from(text));

let id: string;

test.beforeAll(async () => {
	expect(has(PHOTO, 'PhoneCo'), 'the fixture carries camera EXIF').toBe(true);
	const { db, close } = createDb(TEST_ENV.DATABASE_URL);
	try {
		const [kim] = await db
			.select({ id: schema.user.id })
			.from(schema.user)
			.where(eq(schema.user.email, USERS.kim.email));
		const view = await storeUpload(
			db,
			createDiskStorage(TEST_ENV.UPLOAD_DIR),
			{ id: kim.id, platformRole: 'member' },
			{ data: new Uint8Array(PHOTO), name: 'hecke.jpg' }
		);
		id = view.id;
	} finally {
		await close();
	}
});

test('the uploader gets a re-encoded image, without metadata, with safe headers', async ({
	as
}) => {
	const kim = await as('kim');
	const res = await kim.request.get(`/media/${id}/large`);
	expect(res.status()).toBe(200);

	const h = res.headers();
	expect(h['content-type']).toBe('image/webp');
	expect(h['x-content-type-options']).toBe('nosniff');
	expect(h['cache-control']).toBe('private, no-cache');
	expect(h['content-disposition']).toBe('inline');
	expect(h['content-security-policy']).toContain('sandbox');
	expect(h['cross-origin-resource-policy']).toBe('same-origin');

	const body = await res.body();
	expect(body.subarray(8, 12).toString()).toBe('WEBP');
	expect(has(body, 'PhoneCo'), 'camera make removed').toBe(false);
	expect(has(body, 'Exif'), 'no EXIF block at all').toBe(false);
	expect(Number(h['content-length'])).toBe(body.length);
});

test('revalidation answers 304; byte ranges answer 206', async ({ as }) => {
	const kim = await as('kim');
	const first = await kim.request.get(`/media/${id}/thumb`);
	const etag = first.headers()['etag'];
	expect(etag).toBe(`"${id}-thumb"`);

	const again = await kim.request.get(`/media/${id}/thumb`, { headers: { 'if-none-match': etag } });
	expect(again.status()).toBe(304);

	const size = (await first.body()).length;
	const part = await kim.request.get(`/media/${id}/thumb`, { headers: { range: 'bytes=0-11' } });
	expect(part.status()).toBe(206);
	expect(part.headers()['content-range']).toBe(`bytes 0-11/${size}`);
	expect((await part.body()).length).toBe(12);

	const tooFar = await kim.request.get(`/media/${id}/thumb`, {
		headers: { range: `bytes=${size + 10}-` }
	});
	expect(tooFar.status()).toBe(416);
	expect(tooFar.headers()['content-range']).toBe(`bytes */${size}`);
});

test('another member gets 404, as for a file that does not exist', async ({ as }) => {
	const lu = await as('lu');
	expect((await lu.request.get(`/media/${id}/large`)).status()).toBe(404);
	expect((await lu.request.get(`/media/${crypto.randomUUID()}/large`)).status()).toBe(404);
	expect((await lu.request.get(`/media/not-an-id/large`)).status()).toBe(404);

	const sascha = await as('superadmin');
	expect((await sascha.request.get(`/media/${id}/large`)).status()).toBe(200);
});

base('signed out: no file, only the login', async ({ request }) => {
	const res = await request.get(`/media/${id}/large`, { maxRedirects: 0 });
	expect(res.status()).toBe(303);
	expect(res.headers()['location']).toContain('/login');
});
