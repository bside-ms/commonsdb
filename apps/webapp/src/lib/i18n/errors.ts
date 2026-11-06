import { m } from '#lib/paraglide/messages.js';

type MessageFn = () => string;

/** Domain error code → translated message. Unknown codes get a generic text. */
export function errorMessage(code: string): string {
	const fn = (m as unknown as Record<string, MessageFn | undefined>)[`error_${code}`];
	return fn ? fn() : m.error_unknown();
}
