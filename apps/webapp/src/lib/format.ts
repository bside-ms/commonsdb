import { getLocale } from '#lib/paraglide/runtime.js';
import { m } from '#lib/paraglide/messages.js';

/*
 * Display formatting shared by admin and member views. Runs on server and
 * client alike: dates are calendar days ('2026-11-10'), built as local
 * dates and formatted locally, so no time zone can shift them.
 */

const day = (iso: string) => {
	const [y, mo, d] = iso.split('-').map(Number);
	return new Date(y, mo - 1, d);
};

function formatDay(iso: string, withWeekday: boolean) {
	const date = day(iso);
	const sameYear = date.getFullYear() === new Date().getFullYear();
	return new Intl.DateTimeFormat(getLocale(), {
		weekday: withWeekday ? 'short' : undefined,
		day: '2-digit',
		month: '2-digit',
		year: sameYear ? undefined : 'numeric'
	}).format(date);
}

/** "Mo., 10.11." or "10.11. – 12.11." */
export function formatWhen(t: {
	whenKind: 'date' | 'range';
	startsOn: string;
	endsOn: string | null;
}) {
	if (t.whenKind === 'date' || !t.endsOn) return formatDay(t.startsOn, true);
	return `${formatDay(t.startsOn, false)} – ${formatDay(t.endsOn, false)}`;
}

/** 15 → "1,5" (for inputs) */
export const hoursValue = (tenths: number) =>
	(tenths / 10).toLocaleString(getLocale(), { maximumFractionDigits: 1 });

/** 15 → "1,5 Std." */
export const formatHours = (tenths: number) => m.ui_hours({ hours: hoursValue(tenths) });
