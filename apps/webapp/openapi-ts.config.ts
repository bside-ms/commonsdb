import { defineConfig } from '@hey-api/openapi-ts';

/**
 * Generates types, an SDK and valibot schemas from Laravel's OpenAPI
 * spec.
 *
 * The spec is written by the backend (`php artisan scramble:export`)
 * into ../api/storage/app/openapi.json and committed, so the frontend
 * can be generated without a running backend and CI is deterministic.
 *
 * Everything under src/lib/api/generated is machine-written. Never
 * edit it, never import it outside $lib/server/api.
 */
export default defineConfig({
	input: '../api/storage/app/openapi.json',
	output: {
		path: 'src/lib/api/generated',
		format: 'prettier'
	},
	plugins: [
		'@hey-api/typescript',
		{
			name: '@hey-api/client-fetch',
			// No global client: the SvelteKit server passes its own fetch
			// and auth header per call. A module-level singleton would
			// leak one user's token into another request.
			runtimeConfigPath: './src/lib/server/api/runtime.ts'
		},
		{
			name: '@hey-api/sdk',
			// Return { data, error } instead of throwing, so the wrapper
			// decides what an error means.
			throwOnError: false
		},
		{
			// Runtime schemas for remote-function argument validation.
			// Same source of truth as the types — no hand-written
			// duplicate of Laravel's FormRequest rules.
			name: 'valibot',
			requests: true,
			responses: false
		}
	]
});
