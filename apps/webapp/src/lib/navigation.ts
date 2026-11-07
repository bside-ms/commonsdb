import { House, LayoutDashboard } from '@lucide/svelte';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import type { NavItem } from '#lib/ui';

/**
 * Navigation of the two shells. Functions, so labels are translated at
 * render time. Add areas as their slices land; the nav shows from two
 * items on (slice 2 adds Aufgaben: ListChecks, area 'tasks').
 *
 * Prototype areas and their Lucide icons, for later:
 *   Start House · Aufgaben ListChecks · Commons Box · Initiativen Users ·
 *   Qualifikationen GraduationCap
 */
export const memberNav = (): NavItem[] => [
	{ href: resolve('/'), label: m.nav_start(), icon: House, area: 'start' }
];

/** Admin: Aufgaben ListChecks, Bestätigen CheckCheck, Postfach Inbox, Mitglieder Users. */
export const adminNav = (): NavItem[] => [
	{ href: resolve('/admin'), label: m.admin_nav_overview(), icon: LayoutDashboard }
];
