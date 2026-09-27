import { getRequestEvent } from '$app/server';
import * as generated from '../../api/generated/sdk.gen';
import { toApiError } from './errors';

/**
 * The only module that talks to Laravel.
 *
 * Features import from here, never from ../../api/generated directly.
 * Generated code is replaced wholesale on every `pnpm api:generate`,
 * so keeping exactly one importer means a regeneration produces a
 * one-file diff instead of an app-wide one.
 *
 * Usage inside a .remote.ts:
 *
 *   import { api } from '$api/client';
 *   const tasks = await api(sdk.listTasks, { query: { category } });
 */

type SdkFn<Options, Data> = (options: Options) => Promise<{
	data?: Data;
	error?: unknown;
	response: Response;
}>;

/**
 * Calls a generated SDK function with the current request's auth and
 * fetch, unwraps { data, error }, and turns failures into ApiError.
 */
export async function api<Options extends Record<string, unknown>, Data>(
	fn: SdkFn<Options & { fetch?: typeof fetch; headers?: HeadersInit }, Data>,
	options: Options = {} as Options
): Promise<Data> {
	const event = getRequestEvent();
	const token = event.locals.accessToken;

	const result = await fn({
		...options,
		fetch: event.fetch,
		headers: {
			Accept: 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(options.headers as Record<string, string> | undefined)
		}
	});

	if (result.error !== undefined || !result.response.ok) {
		throw toApiError(result.response.status, result.error);
	}

	return result.data as Data;
}

/** Re-exported so features write `sdk.listTasks` with one import. */
export * as sdk from '../../api/generated/sdk.gen';
