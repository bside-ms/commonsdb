/**
 * Slice 5 end to end: an admin creates a weekly series, its occurrences
 * show up for members as ordinary tasks, the admin pauses it and the free
 * ones disappear. Serial; the series is deleted at the end so other files
 * don't see its occurrences.
 */
import { expect, test } from './fixtures.ts';

test.describe.configure({ mode: 'serial' });

const TITLE = 'Bar putzen (Serie)';

test('admin creates a weekly series; the preview shows the next dates', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin/series');
	await alex.getByRole('link', { name: 'Neue Serie' }).click();

	await alex.getByLabel('Titel', { exact: true }).fill(TITLE);
	await alex.getByLabel('Kategorie').selectOption({ label: 'Garten' });
	await alex.getByLabel('Wie oft?').selectOption({ label: 'Jede Woche' });
	await alex.getByLabel('Wochentag', { exact: true }).selectOption({ label: 'Mittwoch' });
	await alex.getByLabel('Stunden').fill('2');
	// monthly-only inputs are hidden once JS runs
	await expect(alex.getByLabel('Tag im Monat', { exact: true })).toBeHidden();
	await expect(alex.locator('p', { hasText: 'Nächste Termine:' })).toContainText('Mi.');

	await alex.getByRole('button', { name: 'Anlegen' }).click();
	await expect(alex).toHaveURL(/\/admin\/series\/[0-9a-f-]{36}$/);
	await expect(alex.getByRole('heading', { level: 1 })).toHaveText(TITLE);
	await expect(alex.getByText('Jeden Mittwoch')).toBeVisible();
	await expect(alex.getByText('1 von 1 frei')).toHaveCount(3);
});

test('members see the occurrences as tasks', async ({ as }) => {
	const kim = await as('kim');
	await kim.goto('/tasks');
	await expect(kim.getByRole('link', { name: TITLE })).toHaveCount(3);
});

test('pause removes the free occurrences; delete removes the series', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin/series');
	await alex.getByRole('link', { name: TITLE }).click();
	await alex.getByRole('button', { name: 'Pausieren' }).click();
	await expect(alex.getByText('Pausiert', { exact: true })).toBeVisible();

	const kim = await as('kim');
	await kim.goto('/tasks');
	await expect(kim.getByRole('link', { name: TITLE })).toHaveCount(0);

	await alex.getByRole('button', { name: 'Löschen' }).click();
	await expect(alex).toHaveURL('/admin/series');
	await expect(alex.getByRole('link', { name: TITLE })).toHaveCount(0);
});
