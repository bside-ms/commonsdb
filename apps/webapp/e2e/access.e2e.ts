/** Who gets where. Fine-grained rules are tested in core; this is the wiring. */
import { test as base } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { USERS } from './users.ts';

base.describe('signed out', () => {
	base('every page sends you to the login, and back afterwards', async ({ page }) => {
		await page.goto('/tasks');
		await expect(page).toHaveURL('/login?redirectTo=%2Ftasks');

		await page.getByLabel('E-Mail').fill(USERS.kim.email);
		await page.getByLabel('Passwort').fill('wrong password');
		await page.getByRole('button', { name: 'Anmelden' }).click();
		await expect(page.getByRole('alert')).toHaveText('E-Mail oder Passwort stimmen nicht.');
	});
});

test('members cannot open the admin area', async ({ as }) => {
	const kim = await as('kim');
	await kim.goto('/admin/tasks');
	await expect(kim).toHaveURL('/');
	await expect(kim.getByRole('link', { name: 'Admin' })).toHaveCount(0);
});

test('admins see tasks, only superadmins see capabilities', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin');
	await expect(alex).toHaveURL('/admin/tasks');
	await expect(alex.getByRole('link', { name: 'Zuständigkeiten' })).toHaveCount(0);

	await alex.goto('/admin/capabilities');
	await expect(alex.getByRole('heading', { level: 1 })).toHaveText('403');

	const sascha = await as('superadmin');
	await sascha.goto('/admin/capabilities');
	await expect(sascha.getByRole('heading', { name: 'Alex Admin' })).toBeVisible();
	await expect(sascha.getByRole('checkbox', { name: 'Garten' })).toBeChecked();
	await expect(sascha.getByRole('checkbox', { name: 'Kochen' })).not.toBeChecked();
});
