/**
 * `as(user)` opens a page that is already logged in as that user. Each
 * call gets its own browser context, so one test can have Alex and Kim
 * side by side, like two people on two phones.
 *
 *   test('…', async ({ as }) => {
 *     const alex = await as('admin');
 *     const kim = await as('kim');
 *   });
 */
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { authFile, type UserKey } from './users.ts';

export const test = base.extend<{ as: (user: UserKey) => Promise<Page> }>({
	as: async ({ browser, baseURL, locale, timezoneId }, use) => {
		const contexts: BrowserContext[] = [];
		await use(async (user) => {
			const context = await browser.newContext({
				storageState: authFile(user),
				baseURL,
				locale,
				timezoneId
			});
			contexts.push(context);
			return context.newPage();
		});
		await Promise.all(contexts.map((c) => c.close()));
	}
});

export { expect };
