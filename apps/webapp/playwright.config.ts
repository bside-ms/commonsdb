import { defineConfig, devices } from '@playwright/test';
import { PORT, TEST_ENV } from './e2e/env.ts';

/**
 * Browser tests against the real app: production build, real Postgres
 * (a separate, freshly created database), real login.
 *
 *   pnpm db:up               # the docker Postgres
 *   pnpm test:e2e            # from the repo root
 *
 * One worker: all tests share one database, and the task flow is a story
 * told in order. Isolation comes from the fresh database per run.
 */
export default defineConfig({
	testDir: './e2e',
	testMatch: '**/*.e2e.ts',
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	globalSetup: './e2e/global-setup.ts',

	use: {
		baseURL: TEST_ENV.ORIGIN,
		locale: 'de-DE',
		timezoneId: 'Europe/Berlin',
		trace: 'retain-on-failure'
	},

	projects: [
		{ name: 'setup', testMatch: /auth\.setup\.ts/ },
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['setup']
		}
	],

	webServer: {
		command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
		url: TEST_ENV.ORIGIN,
		env: TEST_ENV,
		reuseExistingServer: false,
		timeout: 180_000
	}
});
