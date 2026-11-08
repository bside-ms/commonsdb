/**
 * Logs every user in once, through the real login form, and saves the
 * session cookies. Tests then start already logged in (see fixtures.ts),
 * so the login form is exercised here and not repeated everywhere.
 */
import { expect, test as setup } from '@playwright/test';
import { authFile, PASSWORD, USERS, type UserKey } from './users.ts';

for (const key of Object.keys(USERS) as UserKey[]) {
	setup(`log in as ${key}`, async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel('E-Mail').fill(USERS[key].email);
		await page.getByLabel('Passwort').fill(PASSWORD);
		await page.getByRole('button', { name: 'Anmelden' }).click();
		await expect(page.getByRole('heading', { level: 1 })).toContainText(USERS[key].name);
		await page.context().storageState({ path: authFile(key) });
	});
}
