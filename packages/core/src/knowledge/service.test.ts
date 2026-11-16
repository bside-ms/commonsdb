import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { createTestDb, insertUser } from '@commonsdb/db/testing';
import { fromPlainText } from '@commonsdb/richtext';
import { ValidationError } from '../errors.ts';
import type { Actor } from '../roles.ts';
import {
	builtinKnowledge,
	createWikiPage,
	deleteWikiPage,
	exportWikiMarkdown,
	getWikiPage,
	getWikiRevision,
	listDeletedWikiPages,
	listWikiRevisions,
	listWikiTree,
	moveWikiPage,
	restoreWikiPage,
	restoreWikiRevision,
	searchWiki,
	updateWikiPage
} from './service.ts';
import { slugify } from './slug.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

let admin: Actor, kim: Actor;

const text = (s: string) => JSON.stringify(fromPlainText(s));
const fieldOf = (code: string, field: string) => (e: unknown) =>
	e instanceof ValidationError && e.fields[field] === code;

beforeEach(async () => {
	await t.reset();
	admin = await insertUser(db, { id: 'ad', name: 'Ada', role: 'admin' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
});

test('slugify spells out umlauts and never returns nothing', () => {
	assert.equal(slugify('Schlüssel & Türen'), 'schluessel-tueren');
	assert.equal(slugify('  Straße – Café  '), 'strasse-cafe');
	assert.equal(slugify('!!!'), 'seite');
});

test('admins create pages, members read; slugs stay unique', async () => {
	const a = await createWikiPage(db, admin, { title: 'Schlüssel', content: text('Im Büro.') });
	const b = await createWikiPage(db, admin, { title: 'Schlüssel', content: '' });
	assert.deepEqual([a.slug, b.slug], ['schluessel', 'schluessel-2']);
	await assert.rejects(createWikiPage(db, kim, { title: 'X' }), { code: 'forbidden' });

	const page = await getWikiPage(db, kim, 'schluessel');
	assert.equal(page.title, 'Schlüssel');
	assert.equal(page.updatedBy, 'Ada');
	assert.equal(page.canEdit, false);
	assert.equal((await getWikiPage(db, admin, 'schluessel')).canEdit, true);
	await assert.rejects(
		createWikiPage(db, admin, { title: '  ' }),
		fieldOf('wiki_title_required', 'title')
	);
});

test('every save is a revision; renaming keeps the slug; old versions come back', async () => {
	await createWikiPage(db, admin, { title: 'Theke', content: text('Version 1') });
	const v1 = await getWikiPage(db, admin, 'theke');
	await updateWikiPage(db, admin, 'theke', {
		title: 'Theke & Kasse',
		content: text('Version 2'),
		baseRevisionId: v1.revisionId
	});
	const v2 = await getWikiPage(db, admin, 'theke');
	assert.equal(v2.title, 'Theke & Kasse');
	assert.equal(v2.slug, 'theke');

	// saving without changes makes no revision
	await updateWikiPage(db, admin, 'theke', {
		title: v2.title,
		content: JSON.stringify(v2.content),
		baseRevisionId: v2.revisionId
	});
	const revs = await listWikiRevisions(db, 'theke');
	assert.deepEqual(
		revs.map((r) => [r.title, r.current]),
		[
			['Theke & Kasse', true],
			['Theke', false]
		]
	);

	assert.equal((await getWikiRevision(db, 'theke', revs[1].id)).title, 'Theke');
	await restoreWikiRevision(db, admin, 'theke', revs[1].id);
	assert.equal((await getWikiPage(db, kim, 'theke')).title, 'Theke');
	assert.equal((await listWikiRevisions(db, 'theke')).length, 3);
});

test('saving from an old revision is a conflict', async () => {
	await createWikiPage(db, admin, { title: 'Theke' });
	const base = (await getWikiPage(db, admin, 'theke')).revisionId;
	await updateWikiPage(db, admin, 'theke', { title: 'A', baseRevisionId: base });
	await assert.rejects(updateWikiPage(db, admin, 'theke', { title: 'B', baseRevisionId: base }), {
		code: 'wiki_page_conflict'
	});
});

test('three levels at most, also when moving a subtree', async () => {
	const top = await createWikiPage(db, admin, { title: 'Haus' });
	const mid = await createWikiPage(db, admin, { title: 'Keller', parentId: top.id });
	const low = await createWikiPage(db, admin, { title: 'Regal', parentId: mid.id });
	await assert.rejects(
		createWikiPage(db, admin, { title: 'Fach', parentId: low.id }),
		fieldOf('wiki_too_deep', 'parentId')
	);

	const other = await createWikiPage(db, admin, { title: 'Hof' });
	// Keller has a child, so under Hof it is fine (Hof › Keller › Regal) …
	await moveWikiPage(db, admin, 'keller', { parentId: other.id });
	// … but not one level deeper
	const tool = await createWikiPage(db, admin, { title: 'Werkzeug', parentId: other.id });
	await assert.rejects(
		moveWikiPage(db, admin, 'keller', { parentId: tool.id }),
		fieldOf('wiki_too_deep', 'parentId')
	);
	await assert.rejects(
		moveWikiPage(db, admin, 'hof', { parentId: low.id }),
		fieldOf('wiki_move_into_itself', 'parentId')
	);

	const page = await getWikiPage(db, kim, 'regal');
	assert.deepEqual(
		page.breadcrumbs.map((b) => b.title),
		['Hof', 'Keller']
	);
	assert.equal(page.depth, 3);
	assert.deepEqual(
		(await listWikiTree(db)).map((p) => p.title),
		['Haus', 'Keller', 'Regal', 'Hof', 'Werkzeug']
	);
});

test('delete only leaves; deleted pages vanish and come back', async () => {
	const top = await createWikiPage(db, admin, { title: 'Haus' });
	await createWikiPage(db, admin, { title: 'Keller', parentId: top.id });
	await assert.rejects(deleteWikiPage(db, admin, 'haus'), { code: 'wiki_has_children' });

	await deleteWikiPage(db, admin, 'keller');
	await assert.rejects(getWikiPage(db, kim, 'keller'), { code: 'wiki_page_not_found' });
	const [gone] = await listDeletedWikiPages(db, admin);
	assert.equal(gone.title, 'Keller');

	await deleteWikiPage(db, admin, 'haus');
	// the parent is deleted too: Keller comes back on top level
	await restoreWikiPage(db, admin, gone.id);
	assert.deepEqual(await getWikiPage(db, kim, 'keller').then((p) => p.breadcrumbs), []);
});

test('search: German stems, title first, snippet marks the hit', async () => {
	await createWikiPage(db, admin, {
		title: 'Theke',
		content: text('Die Schlüssel für die Kasse hängen im Büro neben der Tür.')
	});
	await createWikiPage(db, admin, { title: 'Schlüsselbund', content: text('Wer hat welchen?') });
	await createWikiPage(db, admin, { title: 'Garten', content: text('Gießkanne im Schuppen.') });

	const hits = await searchWiki(db, 'schlüssel');
	assert.deepEqual(
		hits.map((h) => h.title),
		['Schlüsselbund', 'Theke'],
		'title match first, compounds by prefix'
	);
	const theke = hits.find((h) => h.title === 'Theke');
	assert.match(theke?.snippet ?? '', /«Schlüssel»/);
	assert.deepEqual(await searchWiki(db, '   '), []);
	assert.deepEqual(await searchWiki(db, '&|!'), [], 'operators alone find nothing, no error');
});

test('the built-in provider and the Markdown export', async () => {
	const p = await createWikiPage(db, admin, { title: 'Theke', content: text('Kasse **zählen**') });
	const provider = builtinKnowledge(db, { pageUrl: (slug) => `/wiki/${slug}` });
	const entry = await provider.get(p.id);
	assert.equal(entry?.title, 'Theke');
	assert.equal(entry?.url, '/wiki/theke');
	assert.match(entry?.html ?? '', /<p>Kasse/);
	assert.equal(await provider.get('not-a-uuid'), null);
	assert.equal((await provider.search('kasse'))[0].ref, p.id);

	const md = await exportWikiMarkdown(db, 'theke');
	assert.equal(md.filename, 'theke.md');
	assert.equal(md.markdown, '# Theke\n\nKasse \\*\\*zählen\\*\\*\n');
});
