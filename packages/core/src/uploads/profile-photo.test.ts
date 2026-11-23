import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { createTestDb, insertUser } from '@commonsdb/db/testing';
import { profile, upload } from '@commonsdb/db/schema';
import { createMemoryStorage } from '@commonsdb/media';
import { ValidationError } from '../errors.ts';
import { visiblePhotoId } from '../profile/photo.ts';
import type { Actor } from '../roles.ts';
import { removeProfilePhoto, setProfilePhoto } from './profile-photo.ts';
import { canViewUpload } from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

const storage = createMemoryStorage();
let kim: Actor, lu: Actor, admin: Actor, sa: Actor;

beforeEach(async () => {
	await t.reset();
	storage.files.clear();
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
	lu = await insertUser(db, { id: 'lu', name: 'Lu' });
	admin = await insertUser(db, { id: 'ad', role: 'admin' });
	sa = await insertUser(db, { id: 'sa', role: 'superadmin' });
});

const photo = async () => ({
	data: new Uint8Array(
		await sharp({ create: { width: 600, height: 600, channels: 3, background: '#9bd0f5' } })
			.jpeg()
			.toBuffer()
	),
	name: 'ich.jpg'
});

const photoOf = async (userId: string) =>
	(await db.query.profile.findFirst({ where: eq(profile.userId, userId) }))?.photoId ?? null;

/** What a people list would show `viewer` for Kim. */
const listedFor = async (viewer: Actor) =>
	(
		await db
			.select({ photoId: visiblePhotoId(viewer) })
			.from(profile)
			.where(eq(profile.userId, kim.id))
	)[0].photoId;

const setVisibility = (v: 'members' | 'admins' | 'nobody') =>
	db.update(profile).set({ photoVisibility: v }).where(eq(profile.userId, kim.id));

test('setting a picture; replacing and removing delete the old one at once', async () => {
	const first = await setProfilePhoto(db, storage, kim, await photo());
	assert.equal(await photoOf(kim.id), first.id);
	const filesOfFirst = storage.files.size;
	assert.ok(filesOfFirst > 0);

	const second = await setProfilePhoto(db, storage, kim, await photo());
	assert.equal(await photoOf(kim.id), second.id);
	assert.equal(await db.query.upload.findFirst({ where: eq(upload.id, first.id) }), undefined);
	assert.equal(storage.files.size, filesOfFirst, 'only the new files are left');
	assert.ok([...storage.files.keys()].every((k) => k.includes(second.id)));

	await removeProfilePhoto(db, storage, kim);
	assert.equal(await photoOf(kim.id), null);
	assert.equal(storage.files.size, 0);
	assert.equal((await db.select().from(upload)).length, 0);

	await removeProfilePhoto(db, storage, kim); // nothing to remove: fine
});

test('a wrong file is a field error on `photo` and keeps the old picture', async () => {
	const kept = await setProfilePhoto(db, storage, kim, await photo());
	await assert.rejects(
		setProfilePhoto(db, storage, kim, { data: new TextEncoder().encode('hallo'), name: 'x.jpg' }),
		(e) => e instanceof ValidationError && e.fields.photo === 'upload_type_unsupported'
	);
	assert.equal(await photoOf(kim.id), kept.id);
});

test('photo visibility decides, at /media and in people lists', async () => {
	const { id } = await setProfilePhoto(db, storage, kim, await photo());
	const sees = async (viewer: Actor) => [
		await canViewUpload(db, viewer, id),
		(await listedFor(viewer)) === id
	];

	// default: members
	for (const viewer of [kim, lu, admin, sa]) assert.deepEqual(await sees(viewer), [true, true]);

	await setVisibility('admins');
	assert.deepEqual(await sees(lu), [false, false]);
	assert.deepEqual(await sees(admin), [true, true]);
	assert.deepEqual(await sees(sa), [true, true]);
	assert.deepEqual(await sees(kim), [true, true]);

	await setVisibility('nobody');
	assert.deepEqual(await sees(admin), [false, false]);
	assert.deepEqual(await sees(sa), [false, false], 'superadmins included');
	assert.deepEqual(await sees(kim), [true, true]);
});
