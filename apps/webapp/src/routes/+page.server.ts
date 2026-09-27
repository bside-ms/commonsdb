import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { paths } from '$lib/paths';

export const load: PageServerLoad = async ({ locals }) => {
    redirect(303, locals.accessToken ? paths.tasks : paths.signIn);
};