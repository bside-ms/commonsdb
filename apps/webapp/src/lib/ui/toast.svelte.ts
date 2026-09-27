/**
 * Transient confirmation.
 *
 * Copy rule: the toast repeats the verb from the button that caused
 * it — "Aufgabe übernehmen" produces "Aufgabe übernommen".
 */
export type Tone = 'neutral' | 'accent' | 'danger';

type Item = { id: number; message: string; tone: Tone };

let items = $state<Item[]>([]);
let nextId = 0;

export function toast(
	message: string,
	{ tone = 'neutral', duration = 4000 }: { tone?: Tone; duration?: number } = {}
): number {
	const id = nextId++;
	items.push({ id, message, tone });
	setTimeout(() => dismiss(id), duration);
	return id;
}

export function dismiss(id: number): void {
	const i = items.findIndex((t) => t.id === id);
	if (i !== -1) items.splice(i, 1);
}

export const toasts = {
	get items(): Item[] {
		return items;
	}
};
