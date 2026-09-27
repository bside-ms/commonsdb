import type { CreateClientConfig } from '$lib/api/generated/client.gen';
import { API_BASE_URL } from '$app/env/private';

/**
 * Base configuration for the generated fetch client. Per-request
 * concerns (auth token, the event's fetch) are applied in client.ts.
 */
export const createClientConfig: CreateClientConfig = (config) => ({
	...config,
	baseUrl: API_BASE_URL
});