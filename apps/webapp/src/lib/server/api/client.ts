import { getRequestEvent } from '$app/server';
import * as generated from '../../api/generated/sdk.gen';
import { toApiError, ApiError } from './errors';

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
 *   import { api, sdk } from '$api/client';
 *   const result = await api(sdk.listTasks, { query: { category } });
 *
 * Types are inferred from the SDK function itself rather than
 * hand-declared, because @hey-api/openapi-ts's generated signatures
 * (Options, RequestResult) have enough generic machinery that a
 * hand-written equivalent drifts out of sync with what's actually
 * generated — which is exactly what broke here three times over.
 */

type AnySdkFn = (options: never) => Promise<{ data?: unknown; error?: unknown; response?: Response }>;

type SdkOptions<Fn extends AnySdkFn> = Parameters<Fn>[0];
type SdkResult<Fn extends AnySdkFn> = NonNullable<Awaited<ReturnType<Fn>>['data']>;

export async function api<Fn extends AnySdkFn>(
	fn: Fn,
	options?: SdkOptions<Fn>
): Promise<SdkResult<Fn>> {
	const event = getRequestEvent();
	const token = event.locals.accessToken;

	const result = await fn({
		...(options as object),
		fetch: event.fetch,
		headers: {
			Accept: 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...((options as { headers?: HeadersInit })?.headers as Record<string, string> | undefined)
		}
	} as never);

	if (result.error !== undefined) {
		// response is absent when the error happened building the
		// request or on a network failure (DNS, connection refused) —
		// not something Laravel said, something that stopped us
		// reaching it at all.
		if (!result.response) {
			throw new ApiError(0, 'Die API ist nicht erreichbar.', {});
		}
		throw toApiError(result.response.status, result.error);
	}

	return result.data as SdkResult<Fn>;
}

/** Re-exported so features write `sdk.listTasks` with one import. */
export const sdk = generated;