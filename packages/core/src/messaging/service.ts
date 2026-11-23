import {
	and,
	asc,
	desc,
	eq,
	ilike,
	inArray,
	isNotNull,
	isNull,
	lt,
	ne,
	or,
	sql,
	type SQL
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Db } from '@commonsdb/db';
import {
	message,
	profile,
	shift,
	task,
	thread,
	threadParticipant,
	user,
	userBlock,
	type SystemMessageKind,
	type ThreadKind
} from '@commonsdb/db/schema';
import type { RichTextDoc } from '@commonsdb/richtext';
import { DomainError, ValidationError } from '../errors.ts';
import { isAdmin, type Actor } from '../roles.ts';
import { manageableCategories } from '../tasks/policy.ts';
import { parse } from '../validation.ts';
import { visiblePhotoId } from '../profile/photo.ts';
import {
	adminThreadAccess,
	canWriteTo,
	holdsShift,
	threadAccess,
	type MessagingExecutor as Executor
} from './policy.ts';
import {
	AdminMessageInput,
	ReplyInput,
	StartConversationInput,
	type AdminInboxTab
} from './schema.ts';

// ---- views ------------------------------------------------------------------

export type Person = {
	id: string;
	name: string;
	/** Profile picture upload, where the actor may see it (profile/photo.ts). Only in people lists. */
	photoId?: string | null;
};

export type InboxItem = {
	id: string;
	kind: ThreadKind;
	subject: string | null;
	task: { id: string; title: string } | null;
	/** Direct/group: everyone but the actor. The UI builds the title from this. */
	others: string[];
	lastMessageAt: Date;
	unread: number;
};

export type MessageView = {
	id: string;
	author: Person | null;
	/** Null when retracted. */
	body: RichTextDoc | null;
	system: SystemMessageKind | null;
	retracted: boolean;
	own: boolean;
	createdAt: Date;
};

export type ThreadView = {
	id: string;
	kind: ThreadKind;
	subject: string | null;
	task: { id: string; title: string } | null;
	/** Admin threads: the member who wrote to the admins. */
	member: Person | null;
	claimedBy: Person | null;
	/** The reading admin is the one who took it on. */
	claimedByMe: boolean;
	archived: boolean;
	asAdmin: boolean;
	/** Everyone in the conversation except the actor (admin threads: none). */
	others: Person[];
	/** False in a direct thread the other person closed or blocked. */
	canReply: boolean;
	messages: MessageView[];
};

export type AdminInboxItem = {
	id: string;
	subject: string | null;
	task: { id: string; title: string } | null;
	member: Person | null;
	claimedBy: Person | null;
	archived: boolean;
	firstMessageAt: Date;
	lastMessageAt: Date;
	unread: number;
};

export type Recipient = Person & { isAdmin: boolean };

// ---- internals --------------------------------------------------------------

/** Read state / hidden flag for one person, creating the row on first use. */
async function touch(
	db: Executor,
	threadId: string,
	userId: string,
	set: { lastReadAt: Date } | { hiddenAt: Date }
) {
	await db
		.insert(threadParticipant)
		.values({ threadId, userId, ...set })
		.onConflictDoUpdate({
			target: [threadParticipant.threadId, threadParticipant.userId],
			set
		});
}

/** Append a message, bump the thread, and count it as read for its author. */
async function addMessage(
	db: Executor,
	threadId: string,
	m: { authorId: string; body: RichTextDoc } | { system: SystemMessageKind; body: RichTextDoc }
) {
	const [row] = await db
		.insert(message)
		.values({ threadId, ...m })
		.returning({ id: message.id, createdAt: message.createdAt });
	await db.update(thread).set({ lastMessageAt: row.createdAt }).where(eq(thread.id, threadId));
	if ('authorId' in m) await touch(db, threadId, m.authorId, { lastReadAt: row.createdAt });
	return row.id;
}

const directKey = (a: string, b: string) => [a, b].sort().join(':');

/**
 * Messages newer than the joined participant row's last_read_at, not by
 * the actor. For admins, system messages don't count: an admin caused them.
 */
const unreadFor = (actorId: string, { system = true } = {}) =>
	sql<number>`(
		select count(*) from ${message} m
		where m.thread_id = ${thread.id}
			and m.retracted_at is null
			and m.author_id is distinct from ${actorId}
			and m.created_at > coalesce(${threadParticipant.lastReadAt}, '-infinity'::timestamptz)
			${system ? sql`` : sql`and m.system is null`}
	)`.mapWith(Number);

const hasMessages = sql`exists (select 1 from ${message} m where m.thread_id = ${thread.id})`;

async function assertCanWriteAll(db: Executor, actor: Actor, ids: string[]) {
	for (const id of ids) {
		if (!(await canWriteTo(db, actor, id))) {
			throw new ValidationError({ to: 'message_recipient_unreachable' });
		}
	}
}

// ---- member side ------------------------------------------------------------

/**
 * The actor's own inbox: their direct, group and task conversations and
 * what they wrote to the admins. Newest activity first. Admins see the
 * shared admin inbox separately (listAdminInbox).
 */
export async function listInbox(db: Db, actor: Actor): Promise<InboxItem[]> {
	const heldShift = sql`exists (
		select 1 from ${shift} s where s.task_id = ${thread.taskId} and s.assignee_id = ${actor.id}
	)`;
	const rows = await db
		.select({
			id: thread.id,
			kind: thread.kind,
			subject: thread.subject,
			taskId: task.id,
			taskTitle: task.title,
			lastMessageAt: thread.lastMessageAt,
			unread: unreadFor(actor.id)
		})
		.from(thread)
		.leftJoin(
			threadParticipant,
			and(eq(threadParticipant.threadId, thread.id), eq(threadParticipant.userId, actor.id))
		)
		.leftJoin(task, eq(task.id, thread.taskId))
		.where(
			and(
				or(
					and(inArray(thread.kind, ['direct', 'group']), isNotNull(threadParticipant.userId)),
					and(eq(thread.kind, 'admin'), eq(thread.memberId, actor.id)),
					and(eq(thread.kind, 'task'), heldShift)
				),
				or(
					isNull(threadParticipant.hiddenAt),
					lt(threadParticipant.hiddenAt, thread.lastMessageAt)
				),
				hasMessages
			)
		)
		.orderBy(desc(thread.lastMessageAt))
		.limit(200);

	const groupIds = rows.filter((r) => r.kind === 'direct' || r.kind === 'group').map((r) => r.id);
	const others = new Map<string, string[]>();
	if (groupIds.length) {
		const people = await db
			.select({
				threadId: threadParticipant.threadId,
				name: profile.displayName
			})
			.from(threadParticipant)
			.innerJoin(profile, eq(profile.userId, threadParticipant.userId))
			.where(
				and(inArray(threadParticipant.threadId, groupIds), ne(threadParticipant.userId, actor.id))
			)
			.orderBy(asc(profile.displayName));
		for (const p of people) others.set(p.threadId, [...(others.get(p.threadId) ?? []), p.name]);
	}

	return rows.map(({ taskId, taskTitle, ...r }) => ({
		...r,
		task: taskId && taskTitle ? { id: taskId, title: taskTitle } : null,
		others: others.get(r.id) ?? []
	}));
}

/** Unread messages across the actor's own inbox (the nav badge). */
export async function countUnread(db: Db, actor: Actor): Promise<number> {
	return (await listInbox(db, actor)).reduce((n, t) => n + t.unread, 0);
}

/**
 * One conversation with all its messages. Marks it read for the actor,
 * so call it when the person actually opens the thread.
 */
export async function openThread(db: Db, actor: Actor, threadId: string): Promise<ThreadView> {
	const { thread: t, asAdmin } = await threadAccess(db, actor, threadId);
	await touch(db, t.id, actor.id, { lastReadAt: new Date() });

	const author = alias(profile, 'author');
	const rows = await db
		.select({
			id: message.id,
			authorId: message.authorId,
			authorName: author.displayName,
			body: message.body,
			system: message.system,
			retractedAt: message.retractedAt,
			createdAt: message.createdAt
		})
		.from(message)
		.leftJoin(author, eq(author.userId, message.authorId))
		.where(eq(message.threadId, t.id))
		.orderBy(asc(message.createdAt), asc(message.id));

	const others = await threadPeople(db, t.kind, t.id, t.taskId, actor);
	const canReply =
		t.kind === 'direct' ? others.length === 1 && (await canWriteTo(db, actor, others[0].id)) : true;

	return {
		id: t.id,
		kind: t.kind,
		subject: t.subject,
		task: t.taskId ? await taskRef(db, t.taskId) : null,
		member: t.memberId ? await person(db, t.memberId) : null,
		claimedBy: t.claimedBy ? await person(db, t.claimedBy) : null,
		claimedByMe: t.claimedBy === actor.id,
		archived: t.archivedAt !== null,
		asAdmin,
		others,
		canReply,
		messages: rows.map((r) => ({
			id: r.id,
			author: r.authorId ? { id: r.authorId, name: r.authorName ?? '' } : null,
			body: r.body,
			system: r.system,
			retracted: r.retractedAt !== null,
			own: r.authorId === actor.id,
			createdAt: r.createdAt
		}))
	};
}

async function person(db: Executor, id: string): Promise<Person | null> {
	const [p] = await db
		.select({ id: profile.userId, name: profile.displayName })
		.from(profile)
		.where(eq(profile.userId, id));
	return p ?? null;
}

async function taskRef(db: Executor, id: string) {
	const [t] = await db.select({ id: task.id, title: task.title }).from(task).where(eq(task.id, id));
	return t ?? null;
}

/** Direct/group: participant rows. Task: current shift holders. Admin: nobody listed. */
async function threadPeople(
	db: Executor,
	kind: ThreadKind,
	threadId: string,
	taskId: string | null,
	actor: Actor
): Promise<Person[]> {
	if (kind === 'direct' || kind === 'group') {
		return db
			.select({ id: profile.userId, name: profile.displayName })
			.from(threadParticipant)
			.innerJoin(profile, eq(profile.userId, threadParticipant.userId))
			.where(and(eq(threadParticipant.threadId, threadId), ne(threadParticipant.userId, actor.id)))
			.orderBy(asc(profile.displayName));
	}
	if (kind === 'task' && taskId) {
		return db
			.selectDistinct({ id: profile.userId, name: profile.displayName })
			.from(shift)
			.innerJoin(profile, eq(profile.userId, shift.assigneeId))
			.where(and(eq(shift.taskId, taskId), ne(profile.userId, actor.id)))
			.orderBy(asc(profile.displayName));
	}
	return [];
}

/**
 * Write to one person (direct thread, reused per pair) or several
 * (a new group thread). Returns the thread id.
 */
export async function startConversation(db: Db, actor: Actor, input: unknown): Promise<string> {
	const data = parse(StartConversationInput, input);
	const to = data.to.filter((id) => id !== actor.id);
	if (to.length === 0) throw new ValidationError({ to: 'message_recipients_required' });
	await assertCanWriteAll(db, actor, to);

	return db.transaction(async (tx) => {
		let threadId: string;
		if (to.length === 1) {
			const key = directKey(actor.id, to[0]);
			await tx
				.insert(thread)
				.values({ kind: 'direct', directKey: key, createdBy: actor.id })
				.onConflictDoNothing();
			const [t] = await tx
				.select({ id: thread.id })
				.from(thread)
				.where(and(eq(thread.kind, 'direct'), eq(thread.directKey, key)));
			threadId = t.id;
		} else {
			const [t] = await tx
				.insert(thread)
				.values({ kind: 'group', subject: data.subject, createdBy: actor.id })
				.returning({ id: thread.id });
			threadId = t.id;
		}
		await tx
			.insert(threadParticipant)
			.values([actor.id, ...to].map((userId) => ({ threadId, userId })))
			.onConflictDoNothing();
		await addMessage(tx, threadId, { authorId: actor.id, body: data.body });
		return threadId;
	});
}

/** "Nachricht an die Admins": a new admin thread, optionally about a task. */
export async function writeToAdmins(db: Db, actor: Actor, input: unknown): Promise<string> {
	const data = parse(AdminMessageInput, input);
	if (data.taskId && !(await taskRef(db, data.taskId))) {
		throw new ValidationError({ taskId: 'task_not_found' });
	}
	return db.transaction(async (tx) => {
		const [t] = await tx
			.insert(thread)
			.values({
				kind: 'admin',
				subject: data.subject,
				taskId: data.taskId,
				memberId: actor.id,
				createdBy: actor.id
			})
			.returning({ id: thread.id });
		await addMessage(tx, t.id, { authorId: actor.id, body: data.body });
		return t.id;
	});
}

/**
 * The chat of a task, created on first use. Only for people holding a
 * shift on it. Returns the thread id.
 */
export async function openTaskChat(db: Db, actor: Actor, taskId: string): Promise<string> {
	const t = await taskRef(db, taskId).catch(() => null);
	if (!t) throw new DomainError('task_not_found');
	if (!(await holdsShift(db, actor, taskId))) throw new DomainError('message_task_chat_forbidden');
	await db
		.insert(thread)
		.values({ kind: 'task', taskId, createdBy: actor.id })
		.onConflictDoNothing();
	const [row] = await db
		.select({ id: thread.id })
		.from(thread)
		.where(and(eq(thread.kind, 'task'), eq(thread.taskId, taskId)));
	return row.id;
}

/**
 * Reply in a thread the actor can read. Brings an archived admin thread
 * back to the inbox; an admin replying to an unclaimed one claims it.
 */
export async function reply(
	db: Db,
	actor: Actor,
	threadId: string,
	input: unknown
): Promise<string> {
	const { thread: t, asAdmin } = await threadAccess(db, actor, threadId);
	const data = parse(ReplyInput, input);
	if (t.kind === 'direct') {
		const [other] = await threadPeople(db, t.kind, t.id, null, actor);
		if (!other || !(await canWriteTo(db, actor, other.id))) {
			throw new ValidationError({ body: 'message_recipient_unreachable' });
		}
	}
	return db.transaction(async (tx) => {
		const id = await addMessage(tx, t.id, {
			authorId: actor.id,
			body: data.body
		});
		if (t.archivedAt) {
			await tx
				.update(thread)
				.set({ archivedAt: null, archivedBy: null })
				.where(eq(thread.id, t.id));
		}
		if (asAdmin && !t.claimedBy) {
			await tx
				.update(thread)
				.set({ claimedBy: actor.id })
				.where(and(eq(thread.id, t.id), isNull(thread.claimedBy)));
		}
		return id;
	});
}

/** Take back one's own message, any time. The text is gone for everyone. */
export async function retractMessage(db: Db, actor: Actor, messageId: string) {
	const m = await db.query.message
		.findFirst({
			where: eq(message.id, messageId),
			columns: { authorId: true, threadId: true }
		})
		.catch(() => undefined);
	if (!m || m.authorId !== actor.id) throw new DomainError('message_not_found');
	await db
		.update(message)
		.set({ body: null, retractedAt: new Date() })
		.where(and(eq(message.id, messageId), isNull(message.retractedAt)));
}

/** "Aus meinem Postfach entfernen": hidden until the next message arrives. */
export async function hideThread(db: Db, actor: Actor, threadId: string) {
	const { thread: t } = await threadAccess(db, actor, threadId);
	await touch(db, t.id, actor.id, { hiddenAt: new Date() });
}

/**
 * People the actor may write to, for the recipient picker. Same rules
 * as canWriteTo, in one query.
 */
export async function listRecipients(
	db: Db,
	actor: Actor,
	q = '',
	limit = 500
): Promise<Recipient[]> {
	const where: SQL[] = [ne(user.id, actor.id), isNotNull(profile.onboardedAt)];
	if (!isAdmin(actor)) {
		where.push(
			eq(profile.dmOpen, true),
			eq(profile.visibility, 'members'),
			sql`not exists (
				select 1 from ${userBlock}
				where ${userBlock.blockerId} = ${user.id} and ${userBlock.blockedId} = ${actor.id}
			)`
		);
	}
	const term = q.trim();
	if (term) where.push(ilike(profile.displayName, `%${term.replace(/[\\%_]/g, '\\$&')}%`));
	const rows = await db
		.select({
			id: user.id,
			name: profile.displayName,
			photoId: visiblePhotoId(actor),
			role: user.platformRole
		})
		.from(user)
		.innerJoin(profile, eq(profile.userId, user.id))
		.where(and(...where))
		.orderBy(asc(profile.displayName))
		.limit(limit);
	return rows.map(({ role, ...r }) => ({
		...r,
		isAdmin: role === 'admin' || role === 'superadmin'
	}));
}

// ---- blocking and reachability ----------------------------------------------

export async function blockUser(db: Db, actor: Actor, userId: string) {
	if (userId === actor.id) throw new DomainError('user_block_self');
	if (!(await person(db, userId))) throw new DomainError('user_not_found');
	await db
		.insert(userBlock)
		.values({ blockerId: actor.id, blockedId: userId })
		.onConflictDoNothing();
}

export async function unblockUser(db: Db, actor: Actor, userId: string) {
	await db
		.delete(userBlock)
		.where(and(eq(userBlock.blockerId, actor.id), eq(userBlock.blockedId, userId)));
}

export async function listBlocked(db: Db, actor: Actor): Promise<Person[]> {
	return db
		.select({ id: profile.userId, name: profile.displayName, photoId: visiblePhotoId(actor) })
		.from(userBlock)
		.innerJoin(profile, eq(profile.userId, userBlock.blockedId))
		.where(eq(userBlock.blockerId, actor.id))
		.orderBy(asc(profile.displayName));
}

export type MessagingSettings = { dmOpen: boolean; blocked: Person[] };

/** The actor's own reachability settings, for the profile page. */
export async function getMessagingSettings(db: Db, actor: Actor): Promise<MessagingSettings> {
	const [p] = await db
		.select({ dmOpen: profile.dmOpen })
		.from(profile)
		.where(eq(profile.userId, actor.id));
	return { dmOpen: p?.dmOpen ?? true, blocked: await listBlocked(db, actor) };
}

/** "Andere Mitglieder dürfen mir schreiben". Admins and task chats still reach. */
export async function setDmOpen(db: Db, actor: Actor, open: boolean) {
	await db.update(profile).set({ dmOpen: open }).where(eq(profile.userId, actor.id));
}

// ---- admin side -------------------------------------------------------------

function assertAdmin(actor: Actor) {
	if (!isAdmin(actor)) throw new DomainError('forbidden');
}

/**
 * The admin's default category filter: their capabilities. Superadmins
 * and admins without capabilities see everything.
 */
export async function defaultAdminInboxCategories(db: Db, actor: Actor): Promise<'all' | string[]> {
	assertAdmin(actor);
	const scope = await manageableCategories(db, actor);
	return scope === 'all' || scope.length === 0 ? 'all' : scope;
}

/**
 * The shared admin inbox. Category filter goes through the referenced
 * task; threads without a task always show. Search: subject and member.
 */
export async function listAdminInbox(
	db: Db,
	actor: Actor,
	opts: {
		tab: AdminInboxTab;
		categories: 'all' | string[];
		q?: string;
		sort?: 'recent' | 'waiting';
	}
): Promise<AdminInboxItem[]> {
	assertAdmin(actor);
	const member = alias(profile, 'member');
	const claimer = alias(profile, 'claimer');

	// threads that only collect system messages (send-backs, thanks) show
	// up once the member writes something there
	const memberWrote = sql`exists (
		select 1 from ${message} m
		where m.thread_id = ${thread.id} and m.author_id = ${thread.memberId}
	)`;
	const where: SQL[] = [
		eq(thread.kind, 'admin'),
		isNull(thread.adminDeletedAt),
		hasMessages,
		or(isNull(thread.taskLog), memberWrote)!
	];
	if (opts.tab === 'archive') where.push(isNotNull(thread.archivedAt));
	else where.push(isNull(thread.archivedAt));
	if (opts.tab === 'unclaimed') where.push(isNull(thread.claimedBy));
	if (opts.tab === 'mine') where.push(eq(thread.claimedBy, actor.id));
	if (opts.categories !== 'all' && opts.categories.length) {
		where.push(or(isNull(thread.taskId), inArray(task.categoryId, opts.categories))!);
	}
	const term = opts.q?.trim();
	if (term) {
		const like = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
		where.push(or(ilike(thread.subject, like), ilike(member.displayName, like))!);
	}

	const firstMessageAt = sql<Date>`(
		select min(m.created_at) from ${message} m where m.thread_id = ${thread.id}
	)`.mapWith(thread.createdAt);

	const rows = await db
		.select({
			id: thread.id,
			subject: thread.subject,
			taskId: task.id,
			taskTitle: task.title,
			memberId: thread.memberId,
			memberName: member.displayName,
			claimedById: thread.claimedBy,
			claimedByName: claimer.displayName,
			archivedAt: thread.archivedAt,
			firstMessageAt,
			lastMessageAt: thread.lastMessageAt,
			unread: unreadFor(actor.id, { system: false })
		})
		.from(thread)
		.leftJoin(
			threadParticipant,
			and(eq(threadParticipant.threadId, thread.id), eq(threadParticipant.userId, actor.id))
		)
		.leftJoin(task, eq(task.id, thread.taskId))
		.leftJoin(member, eq(member.userId, thread.memberId))
		.leftJoin(claimer, eq(claimer.userId, thread.claimedBy))
		.where(and(...where))
		.orderBy(opts.sort === 'waiting' ? asc(thread.createdAt) : desc(thread.lastMessageAt))
		.limit(200);

	return rows.map((r) => ({
		id: r.id,
		subject: r.subject,
		task: r.taskId && r.taskTitle ? { id: r.taskId, title: r.taskTitle } : null,
		member: r.memberId ? { id: r.memberId, name: r.memberName ?? '' } : null,
		claimedBy: r.claimedById ? { id: r.claimedById, name: r.claimedByName ?? '' } : null,
		archived: r.archivedAt !== null,
		firstMessageAt: r.firstMessageAt,
		lastMessageAt: r.lastMessageAt,
		unread: r.unread
	}));
}

export type AdminInboxCounts = Record<AdminInboxTab, number>;

/** Threads per tab, for the tab labels. Same filter as the list. */
export async function adminInboxCounts(
	db: Db,
	actor: Actor,
	opts: { categories: 'all' | string[]; q?: string }
): Promise<AdminInboxCounts> {
	const tabs = ['open', 'unclaimed', 'mine', 'archive'] as const;
	const lists = await Promise.all(tabs.map((tab) => listAdminInbox(db, actor, { ...opts, tab })));
	return Object.fromEntries(tabs.map((tab, i) => [tab, lists[i].length])) as AdminInboxCounts;
}

/**
 * The admin nav badge: open threads in the admin's own categories with
 * something unread for them.
 */
export async function countAdminUnread(db: Db, actor: Actor): Promise<number> {
	const categories = await defaultAdminInboxCategories(db, actor);
	const list = await listAdminInbox(db, actor, { tab: 'open', categories });
	return list.filter((t) => t.unread > 0).length;
}

/** "Ich kümmere mich" (also takes it over from another admin) / release one's own claim. */
export async function claimThread(db: Db, actor: Actor, threadId: string, claim: boolean) {
	const t = await adminThreadAccess(db, actor, threadId);
	if (claim) {
		await db.update(thread).set({ claimedBy: actor.id }).where(eq(thread.id, t.id));
	} else {
		await db
			.update(thread)
			.set({ claimedBy: null })
			.where(and(eq(thread.id, t.id), eq(thread.claimedBy, actor.id)));
	}
}

/** Archive or bring back admin threads, one or many. */
export async function archiveThreads(db: Db, actor: Actor, ids: string[], archived: boolean) {
	assertAdmin(actor);
	const valid = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
	if (!valid.length) return;
	await db
		.update(thread)
		.set(
			archived
				? { archivedAt: new Date(), archivedBy: actor.id }
				: { archivedAt: null, archivedBy: null }
		)
		.where(and(inArray(thread.id, valid), eq(thread.kind, 'admin'), isNull(thread.adminDeletedAt)));
}

/** Gone from the admin inbox and archive; the member keeps their copy. */
export async function deleteThreadsForAdmins(db: Db, actor: Actor, ids: string[]) {
	assertAdmin(actor);
	const valid = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
	if (!valid.length) return;
	await db
		.update(thread)
		.set({ adminDeletedAt: new Date(), archivedAt: null, archivedBy: null })
		.where(and(inArray(thread.id, valid), eq(thread.kind, 'admin')));
}
