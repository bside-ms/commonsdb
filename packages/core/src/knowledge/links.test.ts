import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { createTestDb, insertCategories, insertUser } from '@commonsdb/db/testing';
import { fromPlainText } from '@commonsdb/richtext';
import { ValidationError } from '../errors.ts';
import type { Actor } from '../roles.ts';
import { createSeries, getSeriesForAdmin, updateSeries } from '../tasks/series/service.ts';
import {
	createTask,
	duplicateTask,
	getTaskForAdmin,
	getTaskForMember,
	updateTask
} from '../tasks/service.ts';
import { createWikiPage, deleteWikiPage, updateWikiPage, getWikiPage } from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

let sa: Actor, kim: Actor;
let cat: Record<string, string>;
let keys: string[];

beforeEach(async () => {
	await t.reset();
	sa = await insertUser(db, { id: 'sa', role: 'superadmin' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
	({ cat } = await insertCategories(db, { 'Haus & Hof': ['Garten'] }));
	const content = JSON.stringify(
		fromPlainText('Die Heckenschere hängt im Schuppen links. '.repeat(8))
	);
	const a = await createWikiPage(db, sa, { title: 'Werkzeug', content });
	const b = await createWikiPage(db, sa, { title: 'Schuppen' });
	keys = [`builtin:${a.id}`, `builtin:${b.id}`];
});

const task = (over: Record<string, unknown> = {}) => ({
	title: 'Hecke schneiden',
	categoryId: cat.Garten,
	whenKind: 'date',
	startsOn: '2026-11-20',
	shifts: [{ hours: '1' }],
	...over
});

const fieldOf = (code: string) => (e: unknown) =>
	e instanceof ValidationError && e.fields.links === code;

test('a task keeps its links in order; members see title and a short preview', async () => {
	const id = await createTask(db, sa, task({ links: [keys[1], keys[0], keys[1]] }));
	const admin = await getTaskForAdmin(db, sa, id);
	assert.deepEqual(
		admin.links.map((l) => l.title),
		['Schuppen', 'Werkzeug']
	);

	const member = await getTaskForMember(db, kim, id);
	const [schuppen, werkzeug] = member.links;
	assert.equal(schuppen.slug, 'schuppen');
	assert.equal(schuppen.preview, null);
	assert.ok(werkzeug.preview!.startsWith('Die Heckenschere'));
	assert.ok(werkzeug.preview!.length <= 162);

	await updateTask(db, sa, id, task({ links: [keys[0]] }));
	assert.deepEqual(
		(await getTaskForAdmin(db, sa, id)).links.map((l) => l.key),
		[keys[0]]
	);
	const copy = await duplicateTask(db, sa, id);
	assert.equal((await getTaskForAdmin(db, sa, copy)).links[0].title, 'Werkzeug');
});

test('unknown pages are refused, renames show, deleted pages stay as unavailable', async () => {
	await assert.rejects(
		createTask(db, sa, task({ links: ['builtin:00000000-0000-4000-8000-000000000000'] })),
		fieldOf('knowledge_link_not_found')
	);
	await assert.rejects(
		createTask(db, sa, task({ links: ['https://example.org'] })),
		fieldOf('knowledge_link_invalid')
	);

	const id = await createTask(db, sa, task({ links: keys }));
	const base = (await getWikiPage(db, sa, 'werkzeug')).revisionId;
	await updateWikiPage(db, sa, 'werkzeug', { title: 'Werkzeug & Geräte', baseRevisionId: base });
	await deleteWikiPage(db, sa, 'schuppen');

	const links = (await getTaskForMember(db, kim, id)).links;
	assert.deepEqual(
		links.map((l) => [l.title, l.available, l.slug]),
		[
			['Werkzeug & Geräte', true, 'werkzeug'],
			['Schuppen', false, null]
		]
	);
	// saving the task again keeps the link to the deleted page
	await updateTask(db, sa, id, task({ links: keys }));
	assert.equal((await getTaskForAdmin(db, sa, id)).links.length, 2);
});

test('occurrences copy the series links; a new plan brings the new links', async () => {
	const series = {
		...task({ startsOn: undefined, whenKind: undefined }),
		repeat: 'weekly',
		weekday: '1',
		anchor: '2026-11-16',
		lookahead: '2'
	};
	const id = await createSeries(db, sa, { ...series, links: [keys[0]] }, { today: '2026-11-16' });
	const s = await getSeriesForAdmin(db, sa, id, { today: '2026-11-16' });
	assert.deepEqual(
		s.links.map((l) => l.title),
		['Werkzeug']
	);
	const first = s.upcoming[0].taskId;
	assert.deepEqual(
		(await getTaskForAdmin(db, sa, first)).links.map((l) => l.title),
		['Werkzeug']
	);

	await updateSeries(db, sa, id, { ...series, links: keys }, { today: '2026-11-16' });
	const next = (await getSeriesForAdmin(db, sa, id, { today: '2026-11-16' })).upcoming[0].taskId;
	assert.notEqual(next, first); // untouched occurrence was replaced …
	assert.equal((await getTaskForAdmin(db, sa, next)).links.length, 2); // … with the new links
	const orphans = await db.query.knowledgeLink.findMany({
		where: (l, { eq }) => eq(l.entityId, first)
	});
	assert.equal(orphans.length, 0); // and the withdrawn one took its links along
});
