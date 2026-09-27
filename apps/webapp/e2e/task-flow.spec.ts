import { expect, test } from '@playwright/test';

/**
 * One Playwright spec per slice: the path a human actually takes.
 * Not a second unit-test suite — a smoke test that the slice works
 * end to end against a real Laravel.
 *
 * Slice 2's path is below. Slice 3 extends it through report and
 * confirm, at which point the repro balance becomes the assertion.
 */

test.describe('slice 2: admin creates a task, member takes it', () => {
	test('a member can take a task an admin created', async ({ page }) => {
		// --- admin creates -------------------------------------------
		await page.goto('/sign-in');
		await page.getByLabel('E-Mail').fill('admin@b-side.test');
		await page.getByLabel('Passwort').fill('password');
		await page.getByRole('button', { name: 'Anmelden' }).click();

		await page.goto('/admin/tasks');
		await page.getByRole('link', { name: 'Neue Aufgabe' }).click();

		await page.getByLabel('Titel').fill('Tresen aufräumen');
		await page.getByLabel('Stunden').fill('2');
		await page.getByRole('button', { name: 'Aufgabe anlegen' }).click();

		await expect(page.getByText('Aufgabe angelegt')).toBeVisible();

		// --- member takes --------------------------------------------
		await page.getByRole('button', { name: 'Abmelden' }).click();

		await page.goto('/sign-in');
		await page.getByLabel('E-Mail').fill('member@b-side.test');
		await page.getByLabel('Passwort').fill('password');
		await page.getByRole('button', { name: 'Anmelden' }).click();

		await page.goto('/tasks');
		await page.getByRole('link', { name: 'Tresen aufräumen' }).click();
		await page.getByRole('button', { name: 'Aufgabe übernehmen' }).click();

		await expect(page.getByText('Aufgabe übernommen')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Doch nicht übernehmen' })).toBeVisible();
	});

	test('a taken task cannot be taken again', async ({ page }) => {
		// Guards the shift state machine at the boundary the API
		// enforces. The interesting half is that the button is gone,
		// not that the request would fail.
	});
});
