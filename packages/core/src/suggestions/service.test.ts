import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { createTestDb, insertCategories, insertUser } from '@commonsdb/db/testing';
import { task } from '@commonsdb/db/schema';
import { ValidationError } from '../errors.ts';
import type { Actor } from '../roles.ts';
import { setCapabilities } from '../tasks/service.ts';
import {
	convertSuggestion,
	createSuggestion,
	listOwnSuggestions,
	listSuggestionsForAdmin,
	rejectSuggestion
} from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

let superadmin: Actor, garden: Actor, kitchen: Actor, kim: Actor;
let cat: Record<string, string>;

beforeEach(async () => {
	await t.reset();
	superadmin = await insertUser(db, { id: 'sa', role: 'superadmin' });
	garden = await insertUser(db, { id: 'g', role: 'admin' });
	kitchen = await insertUser(db, { id: 'k', role: 'admin' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
	({ cat } = await insertCategories(db, { 'Haus & Hof': ['Garten'], Küche: ['Kochen'] }));
	await setCapabilities(db, superadmin, garden.id, [cat.Garten]);
	await setCapabilities(db, superadmin, kitchen.id, [cat.Kochen]);
});

const taskInput = (over: Record<string, unknown> = {}) => ({
	title: 'Regenrinne reinigen',
	categoryId: cat.Garten,
	whenKind: 'date',
	startsOn: '2026-12-01',
	shifts: [{ hours: '2' }],
	...over
});

const titles = (rows: { title: string }[]) => rows.map((r) => r.title).sort();

test('members suggest; title required, category must exist', async () => {
	await createSuggestion(db, kim, { title: '  Rinne verstopft ', body: '', place: 'Hof' });
	const [own] = await listOwnSuggestions(db, kim);
	assert.equal(own.title, 'Rinne verstopft');
	assert.equal(own.body, null);
	assert.equal(own.status, 'open');

	await assert.rejects(
		createSuggestion(db, kim, { title: ' ' }),
		(e) => e instanceof ValidationError && e.fields.title === 'suggestion_title_required'
	);
	await assert.rejects(
		createSuggestion(db, kim, { title: 'X', categoryId: crypto.randomUUID() }),
		(e) => e instanceof ValidationError && e.fields.categoryId === 'category_not_found'
	);
});

test('routing: category admins, uncategorised to all, superadmins everything', async () => {
	await createSuggestion(db, kim, { title: 'Hecke', categoryId: cat.Garten });
	await createSuggestion(db, kim, { title: 'Herd', categoryId: cat.Kochen });
	await createSuggestion(db, kim, { title: 'Irgendwas' });

	assert.deepEqual(titles(await listSuggestionsForAdmin(db, garden)), ['Hecke', 'Irgendwas']);
	assert.deepEqual(titles(await listSuggestionsForAdmin(db, kitchen)), ['Herd', 'Irgendwas']);
	assert.equal((await listSuggestionsForAdmin(db, superadmin)).length, 3);
	await assert.rejects(listSuggestionsForAdmin(db, kim), { code: 'forbidden' });
});

test('convert creates the task and links it; out of scope is not found', async () => {
	const id = await createSuggestion(db, kim, { title: 'Herd', categoryId: cat.Kochen });
	await assert.rejects(convertSuggestion(db, garden, id, taskInput()), {
		code: 'suggestion_not_found'
	});

	const taskId = await convertSuggestion(db, kitchen, id, taskInput({ categoryId: cat.Kochen }));
	const [own] = await listOwnSuggestions(db, kim);
	assert.equal(own.status, 'converted');
	assert.equal(own.taskId, taskId);
	assert.ok(own.handledAt);

	await assert.rejects(convertSuggestion(db, kitchen, id, taskInput({ categoryId: cat.Kochen })), {
		code: 'suggestion_already_handled'
	});
});

test('a task the admin may not create leaves the suggestion open', async () => {
	const id = await createSuggestion(db, kim, { title: 'Irgendwas' });
	await assert.rejects(convertSuggestion(db, garden, id, taskInput({ categoryId: cat.Kochen })), {
		code: 'forbidden'
	});
	assert.equal((await listOwnSuggestions(db, kim))[0].status, 'open');
	assert.equal((await db.select().from(task)).length, 0);
});

test('two admins at once: one task, one error', async () => {
	const id = await createSuggestion(db, kim, { title: 'Irgendwas' });
	const results = await Promise.allSettled([
		convertSuggestion(db, garden, id, taskInput()),
		convertSuggestion(db, superadmin, id, taskInput())
	]);
	assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
	assert.equal(
		(await db.select().from(task).where(eq(task.title, 'Regenrinne reinigen'))).length,
		1
	);
});

test('reject keeps the note; handled ones cannot be rejected again', async () => {
	const id = await createSuggestion(db, kim, { title: 'Sauna' });
	await rejectSuggestion(db, garden, id, { note: 'Kein Platz, leider.' });
	const [own] = await listOwnSuggestions(db, kim);
	assert.equal(own.status, 'rejected');
	assert.equal(own.rejectionNote, 'Kein Platz, leider.');
	await assert.rejects(rejectSuggestion(db, garden, id, {}), {
		code: 'suggestion_already_handled'
	});
});
