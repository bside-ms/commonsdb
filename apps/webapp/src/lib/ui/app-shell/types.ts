import type { House } from '@lucide/svelte';

export type Area = 'start' | 'tasks' | 'commons' | 'init' | 'qual';

export type NavItem = {
	/** Already resolved (`resolve('/tasks')`). */
	href: string;
	/** Already translated. */
	label: string;
	/** A Lucide icon component, e.g. `ListChecks`. */
	icon?: typeof House;
	/** Member shell: colours the active item with the area colour. */
	area?: Area;
	/** Admin shell: count badge (e.g. open confirmations). Hidden when 0. */
	count?: number;
	/** Custom "is this the current page" check. Default: exact match for '/', prefix match otherwise. */
	match?: (pathname: string) => boolean;
};
