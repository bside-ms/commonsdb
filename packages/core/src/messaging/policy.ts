import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { profile, shift, thread, threadParticipant, user, userBlock } from '@commonsdb/db/schema';
import type { Thread } from '@commonsdb/db/schema';
import { DomainError } from '../errors.ts';
import { isAdmin, type Actor } from '../roles.ts';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
/** A db or a transaction. Own name: tasks/series already exports an `Executor`. */
export type MessagingExecutor = Db | Tx;
type Executor = MessagingExecutor;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * May the actor start a conversation with (or keep writing directly to)
 * this person? Admins reach everyone. Members reach people who keep
 * `dm_open`, show their profile to members and haven't blocked them.
 */
export async function canWriteTo(db: Executor, actor: Actor, toId: string): Promise<boolean> {
	if (toId === actor.id) return false;
	const [row] = await db
		.select({
			dmOpen: profile.dmOpen,
			visibility: profile.visibility,
			blocked: sql<boolean>`exists (
				select 1 from ${userBlock}
				where ${userBlock.blockerId} = ${toId} and ${userBlock.blockedId} = ${actor.id}
			)`
		})
		.from(user)
		.innerJoin(profile, eq(profile.userId, user.id))
		.where(eq(user.id, toId));
	if (!row) return false;
	if (isAdmin(actor)) return true;
	return row.dmOpen && row.visibility === 'members' && !row.blocked;
}

/** Holds (or held and finished) a shift on the task: that's task-chat membership. */
export async function holdsShift(db: Executor, actor: Actor, taskId: string) {
	const [row] = await db
		.select({ id: shift.id })
		.from(shift)
		.where(and(eq(shift.taskId, taskId), eq(shift.assigneeId, actor.id)))
		.limit(1);
	return row !== undefined;
}

export type ThreadAccess = {
	thread: Thread;
	/** Reading an admin thread as one of the admins, not as its member. */
	asAdmin: boolean;
};

/**
 * Who may read a thread, derived from its kind (ROADMAP slice 6a).
 * Anything else is 'thread_not_found', so ids don't leak existence.
 */
export async function threadAccess(
	db: Executor,
	actor: Actor,
	threadId: string
): Promise<ThreadAccess> {
	if (!UUID.test(threadId)) throw new DomainError('thread_not_found');
	const t = await db.query.thread.findFirst({ where: eq(thread.id, threadId) });
	if (!t) throw new DomainError('thread_not_found');

	switch (t.kind) {
		case 'admin':
			if (t.memberId === actor.id) return { thread: t, asAdmin: false };
			if (isAdmin(actor) && t.adminDeletedAt === null) return { thread: t, asAdmin: true };
			break;
		case 'task':
			if (t.taskId && (await holdsShift(db, actor, t.taskId))) return { thread: t, asAdmin: false };
			break;
		case 'direct':
		case 'group': {
			const p = await db.query.threadParticipant.findFirst({
				where: and(eq(threadParticipant.threadId, t.id), eq(threadParticipant.userId, actor.id)),
				columns: { userId: true }
			});
			if (p) return { thread: t, asAdmin: false };
			break;
		}
	}
	throw new DomainError('thread_not_found');
}

/** The thread as an admin of the admin inbox, or 'thread_not_found'. */
export async function adminThreadAccess(db: Executor, actor: Actor, threadId: string) {
	const access = await threadAccess(db, actor, threadId);
	if (!access.asAdmin) throw new DomainError('thread_not_found');
	return access.thread;
}
