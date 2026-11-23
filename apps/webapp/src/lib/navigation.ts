import {
	BookOpen,
	CheckCheck,
	House,
	Inbox,
	KeyRound,
	Lightbulb,
	ListChecks,
	Newspaper,
	Repeat,
	Users,
	Wallet
} from '@lucide/svelte';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import type { NavItem } from '#lib/ui';

/**
 * Navigation of the two shells. Functions, so labels are translated at
 * render time. Add areas as their slices land; the nav shows from two
 * items on.
 *
 * Prototype areas and their Lucide icons, for later:
 *   Start House · Aufgaben ListChecks · Commons Box · Initiativen Users ·
 *   Qualifikationen GraduationCap
 */
export const memberNav = ({ unread = 0 }: { unread?: number } = {}): NavItem[] => [
	{ href: resolve('/'), label: m.nav_start(), icon: House, area: 'start' },
	{ href: resolve('/tasks'), label: m.nav_tasks(), icon: ListChecks, area: 'tasks' },
	{
		href: resolve('/messages'),
		label: m.nav_messages(),
		icon: Inbox,
		area: 'start',
		count: unread,
		countLabel: unread ? m.nav_messages_unread({ count: unread }) : undefined
	},
	{ href: resolve('/wiki'), label: m.nav_wiki(), icon: BookOpen, area: 'qual' },
	{ href: resolve('/account'), label: m.nav_account(), icon: Wallet, area: 'commons' }
];

/**
 * `unread`: open admin threads in the admin's categories with something new.
 * `suggestions`: open suggestions in the admin's categories (and uncategorised ones).
 */
export const adminNav = (
	user: { isSuperadmin: boolean },
	{ unread = 0, suggestions = 0 } = {}
): NavItem[] => [
	{ href: resolve('/admin/tasks'), label: m.admin_nav_tasks(), icon: ListChecks },
	{ href: resolve('/admin/series'), label: m.admin_nav_series(), icon: Repeat },
	{
		href: resolve('/admin/suggestions'),
		label: m.admin_nav_suggestions(),
		icon: Lightbulb,
		count: suggestions,
		countLabel: suggestions ? m.admin_nav_suggestions_open({ count: suggestions }) : undefined
	},
	{ href: resolve('/admin/confirmations'), label: m.admin_nav_confirmations(), icon: CheckCheck },
	{ href: resolve('/admin/news'), label: m.admin_nav_news(), icon: Newspaper },
	{
		href: resolve('/admin/messages'),
		label: m.admin_nav_messages(),
		icon: Inbox,
		count: unread,
		countLabel: unread ? m.nav_messages_unread({ count: unread }) : undefined
	},
	...(user.isSuperadmin
		? [
				{ href: resolve('/admin/members'), label: m.admin_nav_members(), icon: Users },
				{ href: resolve('/admin/capabilities'), label: m.admin_nav_capabilities(), icon: KeyRound }
			]
		: [])
];
