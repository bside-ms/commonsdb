import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { profile } from '@commonsdb/db/schema';
import { createTestDb, insertCategories, insertUser } from '@commonsdb/db/testing';
import { fromPlainText } from '@commonsdb/richtext';
import { ValidationError } from '../errors.ts';
import type { Actor } from '../roles.ts';
import { confirmShift, sendBackShift } from '../tasks/confirmation.ts';
import {
	createTask,
	getTaskForAdmin,
	releaseShift,
	reportShift,
	takeShift
} from '../tasks/service.ts';
import {
	adminInboxCounts,
	archiveThreads,
	blockUser,
	claimThread,
	countAdminUnread,
	countUnread,
	defaultAdminInboxCategories,
	deleteThreadsForAdmins,
	getMessagingSettings,
	hideThread,
	listAdminInbox,
	listInbox,
	listRecipients,
	openTaskChat,
	openThread,
	reply,
	retractMessage,
	setDmOpen,
	startConversation,
	unblockUser,
	writeToAdmins
} from './service.ts';

const t = await createTestDb();
const { db } = t;
after(() => t.close());

let sa: Actor, admin: Actor, kim: Actor, lu: Actor, mo: Actor;
let cat: Record<string, string>;

const body = (text = 'Hallo') => JSON.stringify(fromPlainText(text));

beforeEach(async () => {
	await t.reset();
	sa = await insertUser(db, { id: 'sa', name: 'Sasha', role: 'superadmin' });
	admin = await insertUser(db, { id: 'ad', name: 'Ada', role: 'admin' });
	kim = await insertUser(db, { id: 'kim', name: 'Kim' });
	lu = await insertUser(db, { id: 'lu', name: 'Lu' });
	mo = await insertUser(db, { id: 'mo', name: 'Mo' });
	({ cat } = await insertCategories(db, { 'Haus & Hof': ['Garten', 'Küche'] }));
});

async function taskWithShifts(n = 2, categoryId = cat.Garten) {
	const id = await createTask(db, sa, {
		title: 'Hecke schneiden',
		categoryId,
		whenKind: 'date',
		startsOn: '2026-11-20',
		shifts: Array.from({ length: n }, () => ({ hours: '1' }))
	});
	const shifts = (await getTaskForAdmin(db, sa, id)).shifts.map((s) => s.id);
	return { id, shifts };
}

const fieldOf = (code: string, field: string) => (e: unknown) =>
	e instanceof ValidationError && e.fields[field] === code;

// ---- direct and group --------------------------------------------------------

test('a direct message reaches the other person, unread until opened', async () => {
	const id = await startConversation(db, kim, { to: 'lu', body: body() });
	const [item] = await listInbox(db, lu);
	assert.equal(item.id, id);
	assert.equal(item.kind, 'direct');
	assert.deepEqual(item.others, ['Kim']);
	assert.equal(item.unread, 1);
	assert.equal((await listInbox(db, kim))[0].unread, 0, 'own messages are read');

	const view = await openThread(db, lu, id);
	assert.equal(view.messages.length, 1);
	assert.equal(view.messages[0].author?.name, 'Kim');
	assert.equal(await countUnread(db, lu), 0);
});

test('one direct thread per pair, whoever starts', async () => {
	const a = await startConversation(db, kim, { to: 'lu', body: body() });
	const b = await startConversation(db, lu, {
		to: ['kim'],
		body: body('Zurück')
	});
	assert.equal(a, b);
	assert.equal((await openThread(db, kim, a)).messages.length, 2);
});

test('several recipients make a group; outsiders get not found', async () => {
	const id = await startConversation(db, kim, {
		to: ['lu', 'mo'],
		subject: 'Sommerfest',
		body: body()
	});
	assert.equal((await listInbox(db, mo))[0].kind, 'group');
	assert.deepEqual(
		(await openThread(db, kim, id)).others.map((p) => p.name),
		['Lu', 'Mo']
	);
	await assert.rejects(openThread(db, admin, id), { code: 'thread_not_found' });
});

test('body is required, rich text is validated, length counts plain text', async () => {
	await assert.rejects(
		startConversation(db, kim, { to: 'lu', body: '' }),
		fieldOf('message_body_required', 'body')
	);
	const heading = {
		type: 'doc',
		content: [{ type: 'heading', attrs: { level: 2 } }]
	};
	await assert.rejects(
		startConversation(db, kim, { to: 'lu', body: heading }),
		fieldOf('message_body_invalid', 'body')
	);
	await assert.rejects(
		startConversation(db, kim, { to: 'lu', body: body('x'.repeat(4001)) }),
		fieldOf('message_body_too_long', 'body')
	);
	await assert.rejects(
		startConversation(db, kim, { to: [], body: body() }),
		fieldOf('message_recipients_required', 'to')
	);
});

// ---- reachability -------------------------------------------------------------

test('dm_open = false: members cannot write, admins still can', async () => {
	await setDmOpen(db, lu, false);
	await assert.rejects(
		startConversation(db, kim, { to: 'lu', body: body() }),
		fieldOf('message_recipient_unreachable', 'to')
	);
	await startConversation(db, admin, { to: 'lu', body: body() });
	assert.deepEqual(
		(await listRecipients(db, kim)).map((r) => r.id),
		['ad', 'mo', 'sa']
	);
});

test('profiles visible to admins only are reachable by admins only', async () => {
	await db.update(profile).set({ visibility: 'admins' }).where(eq(profile.userId, 'lu'));
	await assert.rejects(startConversation(db, kim, { to: 'lu', body: body() }));
	assert.ok((await listRecipients(db, admin)).some((r) => r.id === 'lu'));
});

test('blocking stops new and direct messages; unblocking restores', async () => {
	const id = await startConversation(db, kim, { to: 'lu', body: body() });
	await blockUser(db, lu, kim.id);
	await assert.rejects(
		reply(db, kim, id, { body: body() }),
		fieldOf('message_recipient_unreachable', 'body')
	);
	assert.equal((await openThread(db, kim, id)).canReply, false);
	assert.equal((await openThread(db, lu, id)).canReply, true, 'the blocker can still write');
	await assert.rejects(blockUser(db, lu, lu.id), { code: 'user_block_self' });

	assert.deepEqual(await getMessagingSettings(db, lu), {
		dmOpen: true,
		blocked: [{ id: 'kim', name: 'Kim' }]
	});
	await unblockUser(db, lu, kim.id);
	await reply(db, kim, id, { body: body() });
});

// ---- inbox housekeeping ---------------------------------------------------------

test('hidden threads come back with the next message', async () => {
	const id = await startConversation(db, kim, { to: 'lu', body: body() });
	await hideThread(db, lu, id);
	assert.equal((await listInbox(db, lu)).length, 0);
	assert.equal((await listInbox(db, kim)).length, 1, 'only hidden for lu');
	await reply(db, kim, id, { body: body('Noch da?') });
	assert.equal((await listInbox(db, lu)).length, 1);
});

test('authors retract their own messages, nobody else can', async () => {
	const id = await startConversation(db, kim, { to: 'lu', body: body() });
	const [m] = (await openThread(db, kim, id)).messages;
	await assert.rejects(retractMessage(db, lu, m.id), {
		code: 'message_not_found'
	});
	await retractMessage(db, kim, m.id);
	const [after] = (await openThread(db, lu, id)).messages;
	assert.equal(after.retracted, true);
	assert.equal(after.body, null);
});

// ---- task chats -----------------------------------------------------------------

test('task chat: shift holders only, and membership follows the shifts', async () => {
	const tk = await taskWithShifts();
	await assert.rejects(openTaskChat(db, kim, tk.id), {
		code: 'message_task_chat_forbidden'
	});
	await takeShift(db, kim, tk.shifts[0]);
	await takeShift(db, lu, tk.shifts[1]);

	const id = await openTaskChat(db, kim, tk.id);
	assert.equal(await openTaskChat(db, lu, tk.id), id, 'one chat per task');
	assert.equal((await listInbox(db, lu)).length, 0, 'empty chats stay out of the inbox');

	await reply(db, kim, id, { body: body('Wer bringt die Schere?') });
	assert.equal((await listInbox(db, lu))[0].task?.title, 'Hecke schneiden');
	assert.deepEqual(
		(await openThread(db, kim, id)).others.map((p) => p.name),
		['Lu']
	);

	await releaseShift(db, lu, tk.shifts[1]);
	await assert.rejects(openThread(db, lu, id), { code: 'thread_not_found' });
	assert.equal((await listInbox(db, lu)).length, 0);
});

// ---- admin threads -------------------------------------------------------------

test('a message to the admins reaches every admin; replying claims it', async () => {
	const id = await writeToAdmins(db, kim, {
		subject: 'Schlüssel',
		body: body()
	});
	assert.equal((await listInbox(db, kim))[0].kind, 'admin');
	assert.equal((await listInbox(db, admin)).length, 0, 'not in the admin’s own inbox');

	const all = { tab: 'open', categories: 'all' } as const;
	assert.equal((await listAdminInbox(db, admin, all))[0].unread, 1);
	assert.equal((await listAdminInbox(db, sa, all))[0].unread, 1, 'read state is per admin');

	await reply(db, admin, id, { body: body('Liegt im Büro.') });
	const [item] = await listAdminInbox(db, sa, all);
	assert.equal(item.claimedBy?.name, 'Ada');
	assert.equal((await listAdminInbox(db, sa, { ...all, tab: 'unclaimed' })).length, 0);
	assert.equal((await listAdminInbox(db, admin, { ...all, tab: 'mine' })).length, 1);

	await claimThread(db, sa, id, true);
	assert.equal((await openThread(db, kim, id)).claimedBy?.name, 'Sasha');
	await claimThread(db, admin, id, false); // not hers any more: no effect
	assert.equal((await openThread(db, kim, id)).claimedBy?.name, 'Sasha');

	await assert.rejects(listAdminInbox(db, kim, all), { code: 'forbidden' });
	await assert.rejects(openThread(db, lu, id), { code: 'thread_not_found' });
});

test('archive, reply brings back; delete for admins keeps the member copy', async () => {
	const id = await writeToAdmins(db, kim, { body: body() });
	const open = { tab: 'open', categories: 'all' } as const;
	await archiveThreads(db, admin, [id], true);
	assert.equal((await listAdminInbox(db, admin, open)).length, 0);
	assert.equal((await listAdminInbox(db, admin, { ...open, tab: 'archive' })).length, 1);

	await reply(db, kim, id, { body: body('Und?') });
	assert.equal((await listAdminInbox(db, admin, open)).length, 1);

	await deleteThreadsForAdmins(db, admin, [id]);
	assert.equal((await listAdminInbox(db, admin, open)).length, 0);
	assert.equal((await listAdminInbox(db, admin, { ...open, tab: 'archive' })).length, 0);
	await assert.rejects(openThread(db, admin, id), { code: 'thread_not_found' });
	assert.equal((await openThread(db, kim, id)).messages.length, 2);
});

test('category filter goes through the task; threads without a task always show', async () => {
	const garten = await taskWithShifts(1, cat.Garten);
	const kueche = await taskWithShifts(1, cat['Küche']);
	await writeToAdmins(db, kim, { body: body(), taskId: garten.id });
	await writeToAdmins(db, kim, { body: body(), taskId: kueche.id });
	await writeToAdmins(db, kim, { body: body() });

	const list = await listAdminInbox(db, admin, {
		tab: 'open',
		categories: [cat.Garten]
	});
	assert.deepEqual(list.map((i) => i.task?.title ?? '–').sort(), ['Hecke schneiden', '–']);
	assert.equal(await defaultAdminInboxCategories(db, admin), 'all', 'no capabilities → all');
	assert.equal(await defaultAdminInboxCategories(db, sa), 'all');
});

test('search finds subject and member name', async () => {
	await writeToAdmins(db, kim, { subject: 'Schlüssel verloren', body: body() });
	await writeToAdmins(db, lu, { subject: 'Frage', body: body() });
	const find = (q: string) =>
		listAdminInbox(db, admin, { tab: 'open', categories: 'all', q }).then((l) => l.length);
	assert.equal(await find('schlüssel'), 1);
	assert.equal(await find('Lu'), 1);
	assert.equal(await find('%'), 0);
});

// ---- system messages from confirmations -------------------------------------

test('send-back and thanks land in one task thread; admins see it once the member answers', async () => {
	const tk = await taskWithShifts(1);
	await takeShift(db, kim, tk.shifts[0]);
	await reportShift(db, kim, tk.shifts[0], {});
	await sendBackShift(db, sa, tk.shifts[0], { note: 'Bitte noch die Hecke hinten.' });
	await reportShift(db, kim, tk.shifts[0], {});
	await confirmShift(db, sa, tk.shifts[0], { hours: '1', note: 'Danke dir!' });

	const [item] = await listInbox(db, kim);
	assert.equal(item.kind, 'admin');
	assert.equal(item.subject, 'Hecke schneiden');
	assert.equal(item.unread, 2);
	const view = await openThread(db, kim, item.id);
	assert.deepEqual(
		view.messages.map((msg) => msg.system),
		['shift_sent_back', 'shift_confirmed']
	);
	assert.equal(view.messages[0].author, null);

	const open = { tab: 'open', categories: 'all' } as const;
	assert.equal((await listAdminInbox(db, admin, open)).length, 0, 'only system messages so far');
	assert.equal(await countAdminUnread(db, admin), 0);

	await reply(db, kim, item.id, { body: body('Gern!') });
	const [adminItem] = await listAdminInbox(db, admin, open);
	assert.equal(adminItem.unread, 1, 'system messages are not unread for admins');
	assert.equal(await countAdminUnread(db, admin), 1);
	assert.deepEqual(await adminInboxCounts(db, admin, { categories: 'all' }), {
		open: 1,
		unclaimed: 1,
		mine: 0,
		archive: 0
	});
});
