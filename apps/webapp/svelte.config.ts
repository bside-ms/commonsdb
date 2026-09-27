import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * The single config location. vite.config.ts handles Vite and Vitest;
 * everything framework-level is here.
 *
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		// Node, not auto: the BFF holds Keycloak tokens in httpOnly
		// cookies, which needs a real server.
		adapter: adapter(),

		alias: {
			$ui: 'src/lib/ui',
			$features: 'src/lib/features',
			$api: 'src/lib/server/api'
		},

		experimental: {
			remoteFunctions: true,
			explicitEnvironmentVariables: true
		}
	},

	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
