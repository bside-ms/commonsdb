import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
	],

	test: {
		// A test that asserts nothing fails rather than passing quietly.
		expect: { requireAssertions: true },

		projects: [
			{
				// Component tests, in real Chromium. The things worth
				// testing here — focus movement, aria wiring, pointer
				// behaviour — are exactly what jsdom gets wrong.
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},

			{
				// Plain logic: the api wrapper, error mapping, anything
				// with no DOM. Fast, no browser.
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
