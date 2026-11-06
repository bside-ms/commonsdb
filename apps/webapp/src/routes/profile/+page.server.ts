import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({
	profile: locals.profile!,
	email: locals.user!.email,
	platformRole: locals.actor!.platformRole
});
