import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 @type {import('@sveltejs/kit').Config} */ const config = {
	preprocess: vitePreprocess(),

	kit: {
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
		// Force runes mode for the project, except for libraries.
		// Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
		experimental: {
			async: true
		}
	}
};

export default config;