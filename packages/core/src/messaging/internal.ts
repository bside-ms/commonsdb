/*
 * For other core modules only (not exported from the package), like
 * ledger/internal.ts: system messages written as a side effect of
 * something else, inside the caller's transaction.
 */
import { eq } from 'drizzle-orm';
import type { Db } from '@commonsdb/db';
import { message, thread, type SystemMessageKind } from '@commonsdb/db/schema';
import { fromPlainText, type RichTextDoc } from '@commonsdb/richtext';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** A system message needs a body; without a note it is an empty paragraph. */
const EMPTY: RichTextDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

/**
 * Post a system message (send-back reason, confirmation thanks) to the
 * admin thread that collects them for one member and task, creating it
 * on first use. The admin inbox only shows such a thread once the member
 * replies; the member sees it in their inbox right away.
 */
export async function postTaskLogMessage(
	tx: Tx,
	m: {
		memberId: string;
		taskId: string;
		taskTitle: string;
		system: SystemMessageKind;
		note: string | null;
		actorId: string;
	}
) {
	const taskLog = `${m.memberId}:${m.taskId}`;
	await tx
		.insert(thread)
		.values({
			kind: 'admin',
			subject: m.taskTitle,
			taskId: m.taskId,
			memberId: m.memberId,
			taskLog,
			createdBy: m.actorId
		})
		.onConflictDoNothing();
	const [t] = await tx.select({ id: thread.id }).from(thread).where(eq(thread.taskLog, taskLog));

	const [row] = await tx
		.insert(message)
		.values({
			threadId: t.id,
			system: m.system,
			body: (m.note && fromPlainText(m.note)) || EMPTY
		})
		.returning({ createdAt: message.createdAt });
	// back into the inbox: newest activity, out of the archive, visible again for admins
	await tx
		.update(thread)
		.set({ lastMessageAt: row.createdAt, archivedAt: null, archivedBy: null, adminDeletedAt: null })
		.where(eq(thread.id, t.id));
	return t.id;
}
