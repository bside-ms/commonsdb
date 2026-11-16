/*
 * The member side of messaging: inbox, conversations, writing, and the
 * reachability settings (dm_open, blocks). Every function starts with
 * requireActor(); who may read or write what is decided in core.
 */
import { redirect } from '@sveltejs/kit';
import { form, query } from '$app/server';
import * as v from 'valibot';
import {
	blockUser,
	countUnread,
	getMessagingSettings,
	hideThread,
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
} from '@commonsdb/core';
import { toHtml } from '@commonsdb/richtext';
import { db } from '#lib/server/services.ts';
import { requireActor, toFormIssues, toHttpError } from '#lib/server/guards.ts';

const Id = v.pipe(v.string(), v.uuid());
/** Better Auth ids are text, not uuids; core checks they exist. */
const UserId = v.pipe(v.string(), v.nonEmpty());

const threadPath = (id: string) => `/messages/${id}`;

// ---- reads ------------------------------------------------------------------

export const inbox = query(async () => listInbox(db, requireActor()).catch(toHttpError));

/** The nav badge. The layout refreshes it after every navigation. */
export const unreadCount = query(async () => countUnread(db, requireActor()).catch(toHttpError));

/**
 * One conversation, messages rendered to HTML on the server. Reading it
 * marks it read (core's openThread), so only the thread page calls this.
 */
export const thread = query(Id, async (id) => {
	const view = await openThread(db, requireActor(), id).catch(toHttpError);
	return {
		...view,
		messages: view.messages.map(({ body, ...msg }) => ({
			...msg,
			html: toHtml('message', body)
		}))
	};
});

/** Everyone the member may write to; the page filters by name in the browser. */
export const recipients = query(async () => listRecipients(db, requireActor()).catch(toHttpError));

export const messagingSettings = query(async () =>
	getMessagingSettings(db, requireActor()).catch(toHttpError)
);

// ---- writing ----------------------------------------------------------------

/** One recipient → direct conversation, several → group. Opens it afterwards. */
export const send = form(
	v.object({
		to: v.optional(v.array(v.string())),
		subject: v.optional(v.string()),
		body: v.optional(v.string())
	}),
	async (input) => {
		const id = await startConversation(db, requireActor(), input).catch(toFormIssues);
		redirect(303, threadPath(id));
	}
);

export const sendToAdmins = form(
	v.object({
		subject: v.optional(v.string()),
		body: v.optional(v.string()),
		taskId: v.optional(v.string())
	}),
	async (input) => {
		const id = await writeToAdmins(db, requireActor(), input).catch(toFormIssues);
		redirect(303, threadPath(id));
	}
);

export const sendReply = form(
	v.object({ threadId: Id, body: v.optional(v.string()) }),
	async ({ threadId, body }) => {
		await reply(db, requireActor(), threadId, { body }).catch(toFormIssues);
		return { done: true };
	}
);

export const retract = form(v.object({ messageId: Id }), async ({ messageId }) => {
	await retractMessage(db, requireActor(), messageId).catch(toFormIssues);
	return { done: true };
});

/** "Aus meinem Postfach entfernen", back to the inbox. */
export const hide = form(v.object({ threadId: Id }), async ({ threadId }) => {
	await hideThread(db, requireActor(), threadId).catch(toFormIssues);
	redirect(303, '/messages');
});

/** The task's chat, created on first use; only for people holding a shift. */
export const taskChat = form(v.object({ taskId: Id }), async ({ taskId }) => {
	const id = await openTaskChat(db, requireActor(), taskId).catch(toFormIssues);
	redirect(303, threadPath(id));
});

// ---- reachability -----------------------------------------------------------

export const saveDmOpen = form(
	v.object({ dmOpen: v.optional(v.boolean(), false) }),
	async ({ dmOpen }) => {
		await setDmOpen(db, requireActor(), dmOpen);
		return { done: true };
	}
);

export const block = form(v.object({ userId: UserId }), async ({ userId }) => {
	await blockUser(db, requireActor(), userId).catch(toFormIssues);
	return { done: true };
});

export const unblock = form(v.object({ userId: UserId }), async ({ userId }) => {
	await unblockUser(db, requireActor(), userId).catch(toFormIssues);
	return { done: true };
});
