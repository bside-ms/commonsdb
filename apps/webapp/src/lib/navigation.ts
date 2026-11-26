import {
	Box,
	GraduationCap,
	House,
	Inbox,
	KeyRound,
	Lightbulb,
	Newspaper,
	Repeat,
	SquareCheck,
	Users
} from '@lucide/svelte';
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';
import type { NavItem } from '#lib/ui';

/** Pages that belong to "Start" in the prototype (navActive()). */
const START_PATHS = [
	'/messages',
	'/account',
	'/profile',
	'/suggestions',
	'/news',
	'/about'
] as const;
const inStart = (path: string) =>
	path === resolve('/') ||
	START_PATHS.some((p) => path === resolve(p) || path.startsWith(`${resolve(p)}/`));

/**
 * Main nav: the prototype's five areas, in order. Areas not built yet
 * point to a "noch nicht freigeschaltet" page.
 */
export const memberNav = (): NavItem[] => [
	{ href: resolve('/'), label: m.nav_start(), icon: House, area: 'start', match: inStart },
	{ href: resolve('/tasks'), label: m.nav_tasks(), icon: SquareCheck, area: 'tasks' },
	{ href: resolve('/commons'), label: m.nav_commons(), icon: Box, area: 'commons' },
	{ href: resolve('/initiatives'), label: m.nav_initiatives(), icon: Users, area: 'init' },
	{
		href: resolve('/qualifications'),
		label: m.nav_qualifications(),
		icon: GraduationCap,
		area: 'qual'
	}
];

/** Secondary member links below the side nav, in groups (hairline between). */
export const memberMoreNav = ({ unread = 0 }: { unread?: number } = {}): NavItem[][] => [
	[
		{ href: resolve('/account'), label: m.nav_account_mine() },
		{
			href: resolve('/messages'),
			label: m.nav_messages(),
			count: unread,
			countLabel: unread ? m.nav_messages_unread({ count: unread }) : undefined
		},
		{ href: resolve('/suggestions'), label: m.home_suggest_task() },
		{ href: resolve('/about'), label: m.nav_about() }
	],
	[{ href: resolve('/profile/edit'), label: m.profile_edit_title() }]
];

/**
 * `unread`: open admin threads in the admin's categories with something new.
 * `suggestions`: open suggestions in the admin's categories (and uncategorised ones).
 */
export const adminNav = (
	user: { isSuperadmin: boolean },
	{ unread = 0, suggestions = 0 } = {}
): NavItem[] => [
	{ href: resolve('/admin/tasks'), label: m.admin_nav_tasks(), icon: SquareCheck },
	{ href: resolve('/admin/series'), label: m.admin_nav_series(), icon: Repeat },
	{
		href: resolve('/admin/suggestions'),
		label: m.admin_nav_suggestions(),
		icon: Lightbulb,
		count: suggestions,
		countLabel: suggestions ? m.admin_nav_suggestions_open({ count: suggestions }) : undefined
	},
	{ href: resolve('/admin/confirmations'), label: m.admin_nav_confirmations(), icon: SquareCheck },
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
