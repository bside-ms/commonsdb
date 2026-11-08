/** The people in the e2e world. Created by global-setup.ts, logged in by auth.setup.ts. */

export const PASSWORD = 'e2e-password-123';

export const USERS = {
	superadmin: {
		name: 'Sascha Super',
		email: 'sascha@e2e.test',
		role: 'superadmin'
	},
	admin: { name: 'Alex Admin', email: 'alex@e2e.test', role: 'admin' },
	kim: { name: 'Kim', email: 'kim@e2e.test', role: 'member' },
	lu: { name: 'Lu', email: 'lu@e2e.test', role: 'member' }
} as const;

export type UserKey = keyof typeof USERS;

/** Alex manages these categories (and nothing else). */
export const ADMIN_CATEGORIES = ['Garten', 'Reinigung'];

export const TAXONOMY = {
	'Haus & Hof': ['Garten', 'Reinigung'],
	Küche: ['Kochen']
};

/** Saved login (cookies) per user, written by auth.setup.ts. */
export const authFile = (user: UserKey) => `e2e/.auth/${user}.json`;
