import { defineEnvVars } from '@sveltejs/kit/env';
import * as v from 'valibot';

export const variables = defineEnvVars({
	API_BASE_URL: {
		schema: v.pipe(v.string(), v.url()),
		description: 'The Laravel API. Server-side only — the browser talks to SvelteKit, not Laravel directly.'
	}
});