/**
 * Route constants. Routes are English, and stay English.
 *
 * This exists so no href is a bare string anywhere in the app. That
 * costs nothing now and is the entire prerequisite for adding German
 * (or any other) URLs later via the `reroute` hook for a whitelabel
 * deployment — one file changes instead of every component.
 */
export const paths = {
	home: '/',

	signIn: '/sign-in',
	register: '/register',

	tasks: '/tasks',
	task: (id: string) => `/tasks/${id}`,

	account: '/account',
	profile: '/profile',
	settings: '/settings',

	admin: {
		tasks: '/admin/tasks',
		task: (id: string) => `/admin/tasks/${id}`,
		review: '/admin/review',
		users: '/admin/users'
	}
} as const;
