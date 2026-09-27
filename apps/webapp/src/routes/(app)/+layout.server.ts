import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { api, sdk } from '$api/client';
import { ApiError } from '$api/errors';
import { paths } from '$lib/paths';

/**
* The gate for everything behind sign-in.
*
* Loading the user here rather than in hooks.server.ts means one
* round trip per navigation into the app, not one per request
* including every asset.
*/
export const load: LayoutServerLoad = async ({ locals }) => {
    if (!locals.accessToken) {
    redirect(303, paths.signIn);
}

    try {
    return { user: await api(sdk.meShow) };
} catch (error) {
    // A token that the API rejects is the same as no token: send
    // them to sign in rather than showing a broken shell.
    if (error instanceof ApiError && error.status === 401) {
    redirect(303, paths.signIn);
}
    throw error;
}
};