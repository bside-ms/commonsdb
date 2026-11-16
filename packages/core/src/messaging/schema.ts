import * as v from 'valibot';
import { parseRichText, toText } from '@commonsdb/richtext';
import { optionalText } from '../validation.ts';

/** Characters of plain text per message, formatting not counted. */
export const MESSAGE_MAX_CHARS = 4000;
export const MESSAGE_MAX_RECIPIENTS = 50;

/** A TipTap document (JSON string from a form, or an object), profile 'message'. */
export const MessageBody = v.pipe(
	v.optional(v.unknown(), null),
	v.rawTransform(({ dataset, addIssue, NEVER }) => {
		const result = parseRichText('message', dataset.value);
		if (!result.ok) {
			addIssue({
				message:
					result.reason === 'link'
						? 'message_body_link_invalid'
						: result.reason === 'too_large'
							? 'message_body_too_long'
							: 'message_body_invalid'
			});
			return NEVER;
		}
		if (!result.doc) {
			addIssue({ message: 'message_body_required' });
			return NEVER;
		}
		if (toText('message', result.doc).length > MESSAGE_MAX_CHARS) {
			addIssue({ message: 'message_body_too_long' });
			return NEVER;
		}
		return result.doc;
	})
);

const Subject = optionalText(200, 'message_subject_too_long');

/** One id or several (forms post repeated fields); trimmed, deduplicated. */
const Recipients = v.pipe(
	v.optional(v.union([v.string(), v.array(v.string())]), []),
	v.transform((x) => [
		...new Set((Array.isArray(x) ? x : [x]).map((s) => s.trim()).filter(Boolean))
	]),
	v.minLength(1, 'message_recipients_required'),
	v.maxLength(MESSAGE_MAX_RECIPIENTS, 'message_too_many_recipients')
);

/** '' or missing → null, otherwise a uuid. */
const optionalId = (code: string) =>
	v.pipe(
		v.optional(v.nullable(v.string()), null),
		v.transform((s) => s?.trim() || null),
		v.nullable(v.pipe(v.string(), v.uuid(code)))
	);

/** One recipient → direct thread, several → group thread (subject optional). */
export const StartConversationInput = v.object({
	to: Recipients,
	subject: Subject,
	body: MessageBody
});

export const AdminMessageInput = v.object({
	subject: Subject,
	body: MessageBody,
	taskId: optionalId('task_not_found')
});

export const ReplyInput = v.object({ body: MessageBody });

/** Offen · Niemand kümmert sich · Meine · Archiv */
export const ADMIN_INBOX_TABS = ['open', 'unclaimed', 'mine', 'archive'] as const;
export type AdminInboxTab = (typeof ADMIN_INBOX_TABS)[number];
