import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { createTestDb, insertUser } from '@commonsdb/db/testing';
import { fromPlainText } from '@commonsdb/richtext';
import { ValidationError } from '../errors.ts';
import type { Actor } from '../roles.ts';
import { getSitePage, saveSitePage } from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

let superadmin: Actor, admin: Actor, kim: Actor;

beforeEach(async () => {
	await t.reset();
	superadmin = await insertUser(db, { id: 'sa', name: 'Sam', role: 'superadmin' });
	admin = await insertUser(db, { id: 'ad', role: 'admin' });
	kim = await insertUser(db, { id: 'kim' });
});

const text = (s: string) => JSON.stringify(fromPlainText(s));

test('an unwritten page is empty, not missing', async () => {
	const page = await getSitePage(db, kim, 'about');
	assert.equal(page.content, null);
	assert.equal(page.updatedAt, null);
	assert.equal(page.canEdit, false);
	assert.equal((await getSitePage(db, superadmin, 'about')).canEdit, true);
});

test('only superadmins write; saving twice updates the one row', async () => {
	await assert.rejects(saveSitePage(db, admin, 'about', { content: text('X') }), {
		code: 'forbidden'
	});
	await saveSitePage(db, superadmin, 'about', { content: text('Wir sind die B-Side.') });
	await saveSitePage(db, superadmin, 'about', { content: text('Wir sind die B-Side!') });

	const page = await getSitePage(db, kim, 'about');
	assert.equal(page.updatedBy, 'Sam');
	assert.match(JSON.stringify(page.content), /B-Side!/);

	await saveSitePage(db, superadmin, 'about', { content: '' });
	assert.equal((await getSitePage(db, kim, 'about')).content, null);
});

test('unknown slugs and foreign content are refused', async () => {
	await assert.rejects(getSitePage(db, kim, 'impressum'), { code: 'site_page_not_found' });
	await assert.rejects(saveSitePage(db, superadmin, 'impressum', {}), {
		code: 'site_page_not_found'
	});
	const script = JSON.stringify({ type: 'doc', content: [{ type: 'iframe' }] });
	await assert.rejects(
		saveSitePage(db, superadmin, 'about', { content: script }),
		(e) => e instanceof ValidationError && e.fields.content === 'site_page_invalid'
	);
});
