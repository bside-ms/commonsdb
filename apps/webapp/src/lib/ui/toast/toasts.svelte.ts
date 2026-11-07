/**
 * Tiny toast queue. Client-side only: call `toast()` from event handlers or
 * after `enhance` resolves, never during SSR (module state is shared across
 * requests on the server).
 *
 *   import { toast } from '#lib/ui';
 *   toast(m.task_taken());
 *   toast(m.error_unknown(), { tone: 'danger' });
 */

export type ToastTone = 'default' | 'danger';

export type Toast = {
	id: number;
	message: string;
	tone: ToastTone;
};

const DEFAULT_DURATION = 4000;

let nextId = 1;
export const toasts = $state<Toast[]>([]);

export function dismiss(id: number) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i !== -1) toasts.splice(i, 1);
}

export function toast(
	message: string,
	{ tone = 'default', duration = DEFAULT_DURATION }: { tone?: ToastTone; duration?: number } = {}
) {
	const id = nextId++;
	toasts.push({ id, message, tone });
	// keep it short: at most three on screen
	if (toasts.length > 3) toasts.shift();
	if (duration > 0) setTimeout(() => dismiss(id), duration);
	return id;
}
