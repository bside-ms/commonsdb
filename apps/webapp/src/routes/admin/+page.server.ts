import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** No admin dashboard yet: /admin opens the task list. */
export const load: PageServerLoad = () => redirect(307, '/admin/tasks');
