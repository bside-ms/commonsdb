import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { createTestDb, insertCategories, insertUser } from '@commonsdb/db/testing';
import { task } from '@commonsdb/db/schema';
import { createMemoryStorage } from '@commonsdb/media';
import { ValidationError } from '../errors.ts';
import type { Actor } from '../roles.ts';
import { canViewUpload, storeUpload } from '../uploads/service.ts';
import {
	createTask,
	duplicateTask,
	getTaskForAdmin,
	listTasksForAdmin,
	listTasksForMember,
	setCapabilities,
	updateTask
} from './service.ts';
import { localToday } from './shifts.ts';
import { addDays } from './series/rule.ts';
import { createSeries, getSeriesForAdmin } from './series/service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

const TODAY = localToday();
const storage = createMemoryStorage();
let superadmin: Actor, admin: Actor, otherAdmin: Actor, kim: Actor;
let cat: Record<string, string>;

beforeEach(async () => {
	await t.reset();
	superadmin = await insertUser(db, { id: 'sa', role: 'superadmin' });
	admin = await insertUser(db, { id: 'ad', role: 'admin' });
	otherAdmin = await insertUser(db, { id: 'ad2', role: 'admin' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
	({ cat } = await insertCategories(db, { 'Haus & Hof': ['Garten'] }));
	await setCapabilities(db, superadmin, admin.id, [cat.Garten]);
	await setCapabilities(db, superadmin, otherAdmin.id, [cat.Garten]);
});

const input = (over: Record<string, unknown> = {}) => ({
	title: 'Hecke schneiden',
	categoryId: cat.Garten,
	whenKind: 'date',
	startsOn: addDays(TODAY, 2),
	shifts: [{ hours: '2' }],
	...over
});

async function photo(by: Actor) {
	const data = new Uint8Array(
		await sharp({ create: { width: 800, height: 600, channels: 3, background: '#f0703a' } })
			.jpeg()
			.toBuffer()
	);
	return (await storeUpload(db, storage, by, { data, name: 'hecke.jpg' }, { allow: ['image'] })).id;
}

async function fieldsOf(p: Promise<unknown>) {
	try {
		await p;
	} catch (e) {
		if (e instanceof ValidationError) return e.fields;
		throw e;
	}
	assert.fail('expected a ValidationError');
}

test('a task photo shows in the lists, and every member may see it', async () => {
	const imageId = await photo(admin);
	assert.equal(await canViewUpload(db, kim, imageId), false, 'not used yet: uploader only');

	const id = await createTask(db, admin, input({ imageId, imageAlt: '  Die Hecke am Tor ' }));

	const [item] = await listTasksForMember(db, kim);
	assert.deepEqual(item.image, { id: imageId, alt: 'Die Hecke am Tor' });
	assert.equal((await listTasksForAdmin(db, admin))[0].image?.id, imageId);
	assert.equal((await getTaskForAdmin(db, admin, id)).imageId, imageId);
	assert.equal(await canViewUpload(db, kim, imageId), true);
});

test("without a photo the image is null; '' clears it", async () => {
	const id = await createTask(db, admin, input({ imageId: await photo(admin) }));
	await updateTask(db, admin, id, input({ imageId: '', imageAlt: 'egal' }));
	const [item] = await listTasksForMember(db, kim);
	assert.equal(item.image, null);
});

test("someone else's upload is refused; keeping the current one is fine", async () => {
	const theirs = await photo(kim);
	assert.deepEqual(await fieldsOf(createTask(db, admin, input({ imageId: theirs }))), {
		image: 'upload_not_found'
	});
	assert.deepEqual(await fieldsOf(createTask(db, admin, input({ imageId: crypto.randomUUID() }))), {
		image: 'upload_not_found'
	});

	// Alex's photo stays when another admin edits the task
	const imageId = await photo(admin);
	const id = await createTask(db, admin, input({ imageId }));
	await updateTask(db, otherAdmin, id, input({ title: 'Hecke + Beet', imageId }));
	assert.equal((await getTaskForAdmin(db, admin, id)).imageId, imageId);
});

test('a malformed id is a field error, not a crash', async () => {
	assert.deepEqual(await fieldsOf(createTask(db, admin, input({ imageId: 'x' }))), {
		imageId: 'upload_not_found'
	});
});

test('copies and occurrences share the upload', async () => {
	const imageId = await photo(admin);
	const id = await createTask(db, admin, input({ imageId, imageAlt: 'Hecke' }));
	const copy = await duplicateTask(db, admin, id);
	assert.equal((await getTaskForAdmin(db, admin, copy)).imageId, imageId);

	const seriesPhoto = await photo(admin);
	const seriesId = await createSeries(db, admin, {
		...input({ imageId: seriesPhoto, imageAlt: 'Bar' }),
		repeat: 'weekly',
		weekday: String((new Date(`${addDays(TODAY, 1)}T00:00:00Z`).getUTCDay() + 6) % 7),
		anchor: TODAY
	});
	assert.equal((await getSeriesForAdmin(db, admin, seriesId)).imageId, seriesPhoto);
	const occurrences = await db
		.select({ imageId: task.imageId, imageAlt: task.imageAlt })
		.from(task)
		.where(eq(task.seriesId, seriesId));
	assert.ok(occurrences.length > 0);
	for (const o of occurrences) assert.deepEqual(o, { imageId: seriesPhoto, imageAlt: 'Bar' });
	assert.equal(await canViewUpload(db, kim, seriesPhoto), true);
});

test('alt text is limited', async () => {
	assert.deepEqual(await fieldsOf(createTask(db, admin, input({ imageAlt: 'x'.repeat(201) }))), {
		imageAlt: 'task_image_alt_too_long'
	});
});
