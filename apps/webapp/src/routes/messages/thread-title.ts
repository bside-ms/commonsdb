import type { InboxItem } from '@commonsdb/core';
import { m } from '#lib/paraglide/messages.js';

type ThreadKind = InboxItem['kind'];

/**
 * What a conversation is called, from the reader's side: the other
 * person (direct), the subject or the names (group), the task (task chat),
 * the subject or "An die Admins" (admin). Used by inbox and thread page.
 */
export function threadTitle(t: {
	kind: ThreadKind;
	subject: string | null;
	task: { title: string } | null;
	others: string[];
}) {
	switch (t.kind) {
		case 'direct':
			return t.others[0] ?? m.messages_someone();
		case 'group':
			return t.subject || t.others.join(', ') || m.messages_group();
		case 'task':
			return t.task?.title ?? m.messages_task_chat();
		case 'admin':
			return t.subject || m.messages_to_admins();
	}
}

export const kindLabel = (kind: ThreadKind) =>
	({
		direct: null,
		group: m.messages_kind_group(),
		task: m.messages_kind_task(),
		admin: m.messages_kind_admin()
	})[kind];
