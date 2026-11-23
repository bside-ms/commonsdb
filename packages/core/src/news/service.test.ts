import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { createTestDb, insertUser } from '@commonsdb/db/testing';
import { news } from '@commonsdb/db/schema';
import { fromPlainText } from '@commonsdb/richtext';
import { ValidationError } from '../errors.ts';
import type { Actor } from '../roles.ts';
import {
	createNews,
	deleteNews,
	getNewsForAdmin,
	listCurrentNews,
	listNewsArchive,
	listNewsForAdmin,
	updateNews
} from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

let admin: Actor, kim: Actor;

beforeEach(async () => {
	await t.reset();
	admin = await insertUser(db, { id: 'ad', name: 'Ada', role: 'admin' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
});

const body = (s = 'Kommt alle!') => JSON.stringify(fromPlainText(s));
const post = (over: Record<string, unknown> = {}) =>
	createNews(db, admin, { title: 'Hoffest', body: body(), published: 'on', ...over });

/** Move a post's publication date, so ordering doesn't depend on timing. */
const publishedOn = (id: string, iso: string) =>
	db
		.update(news)
		.set({ publishedAt: new Date(iso) })
		.where(eq(news.id, id));

const day = (offset: number) => {
	const d = new Date();
	d.setDate(d.getDate() + offset);
	return d.toLocaleDateString('sv'); // YYYY-MM-DD, local
};

const titles = (rows: { title: string }[]) => rows.map((r) => r.title);

test('admins write, members may not; title and body are required', async () => {
	const id = await post();
	const item = await getNewsForAdmin(db, admin, id);
	assert.equal(item.author, 'Ada');
	assert.ok(item.publishedAt);

	await assert.rejects(post({ title: ' ' }), (e) => {
		return e instanceof ValidationError && e.fields.title === 'news_title_required';
	});
	await assert.rejects(post({ body: '' }), (e) => {
		return e instanceof ValidationError && e.fields.body === 'news_body_required';
	});
	await assert.rejects(createNews(db, kim, { title: 'X', body: body() }), { code: 'forbidden' });
	await assert.rejects(listNewsForAdmin(db, kim), { code: 'forbidden' });
});

test('the news profile has no headings', async () => {
	const heading = JSON.stringify({
		type: 'doc',
		content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'X' }] }]
	});
	await assert.rejects(post({ body: heading }), (e) => {
		return e instanceof ValidationError && e.fields.body === 'news_body_invalid';
	});
});

test('drafts stay hidden; expired posts leave the start page, not the archive', async () => {
	await post({ title: 'Entwurf', published: undefined });
	await post({ title: 'Vorbei', visibleUntil: day(-1) });
	await post({ title: 'Heute noch', visibleUntil: day(0) });
	await post({ title: 'Offen' });

	assert.deepEqual(titles(await listCurrentNews(db)).sort(), ['Heute noch', 'Offen']);
	assert.deepEqual(titles(await listNewsArchive(db)).sort(), ['Heute noch', 'Offen', 'Vorbei']);
	assert.equal((await listNewsForAdmin(db, admin))[0].title, 'Entwurf');
});

test('start page: pinned first, then the newest three', async () => {
	for (const [i, title] of ['A', 'B', 'C', 'D'].entries()) {
		await publishedOn(await post({ title }), `2026-11-0${i + 1}T12:00:00Z`);
	}
	await publishedOn(await post({ title: 'Alt, aber wichtig', pinned: 'on' }), '2026-10-01');

	assert.deepEqual(titles(await listCurrentNews(db)), ['Alt, aber wichtig', 'D', 'C', 'B']);
});

test('publishing again keeps the date; unticking makes a draft', async () => {
	const id = await post();
	await publishedOn(id, '2026-11-01T12:00:00Z');
	await updateNews(db, admin, id, { title: 'Hoffest!', body: body(), published: true });
	const kept = await getNewsForAdmin(db, admin, id);
	assert.equal(kept.title, 'Hoffest!');
	assert.equal(kept.publishedAt?.toISOString(), '2026-11-01T12:00:00.000Z');

	await updateNews(db, admin, id, { title: 'Hoffest!', body: body() });
	assert.equal((await getNewsForAdmin(db, admin, id)).publishedAt, null);
	assert.equal((await listCurrentNews(db)).length, 0);
});

test('delete is for good', async () => {
	const id = await post();
	await assert.rejects(deleteNews(db, kim, id), { code: 'forbidden' });
	await deleteNews(db, admin, id);
	await assert.rejects(getNewsForAdmin(db, admin, id), { code: 'news_not_found' });
	await assert.rejects(deleteNews(db, admin, id), { code: 'news_not_found' });
});
