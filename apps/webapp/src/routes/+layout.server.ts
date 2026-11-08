import { isAdmin, isSuperadmin } from '@commonsdb/core';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	user:
		locals.actor && locals.profile
			? {
					displayName: locals.profile.displayName,
					isAdmin: isAdmin(locals.actor),
					isSuperadmin: isSuperadmin(locals.actor)
				}
			: null
});
