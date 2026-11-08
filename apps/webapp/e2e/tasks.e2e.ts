/**
 * The slice 2 demo, end to end: an admin puts a task in, a member takes
 * it, both see it; then it changes hands. Steps build on each other, so
 * the file runs serially.
 */
import { expect, test } from './fixtures.ts';

test.describe.configure({ mode: 'serial' });

const TITLE = 'Hecke am Hof schneiden';

test('admin creates a task; core validation shows per field', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin/tasks');
	await alex.getByRole('link', { name: 'Neue Aufgabe' }).click();

	await alex.getByLabel('Titel', { exact: true }).fill(TITLE);
	await alex.getByLabel('Kategorie').selectOption({ label: 'Garten' });
	await alex.getByRole('textbox', { name: /Beschreibung/ }).fill('Werkzeug liegt im Schuppen.');
	await alex.getByLabel('Irgendwann in einem Zeitraum').check();
	await alex.getByLabel('Datum', { exact: true }).fill('2030-05-10');
	await alex.getByLabel('Bis', { exact: true }).fill('2030-05-17');
	await alex.getByLabel('Stunden').fill('0,7');
	await alex.getByLabel('Ort (optional)').fill('Hof');
	await alex.getByRole('button', { name: 'Anlegen' }).click();

	// the server (core) rejects it; the form keeps the input
	await expect(alex.getByText('Bitte in halben Stunden (z. B. 1,5).')).toBeVisible();
	await expect(alex.getByLabel('Titel', { exact: true })).toHaveValue(TITLE);

	await alex.getByLabel('Stunden').fill('1,5');
	await alex.getByRole('button', { name: 'Anlegen' }).click();

	await expect(alex).toHaveURL('/admin/tasks');
	const row = alex.getByRole('listitem').filter({ hasText: TITLE });
	await expect(row).toContainText('Garten');
	await expect(row).toContainText('1,5 Std.');
	await expect(row).toContainText('Offen');
});

test('Kim takes it; Lu no longer sees it; Alex sees who has it', async ({ as }) => {
	const kim = await as('kim');
	await kim.goto('/tasks');
	await kim.getByRole('link', { name: TITLE }).click();

	await expect(kim.getByText('Werkzeug liegt im Schuppen.')).toBeVisible();
	await kim.getByRole('button', { name: 'Übernehmen' }).click();
	const dialog = kim.getByRole('dialog');
	await expect(dialog).toContainText('10.05.2030 – 17.05.2030');
	await dialog.getByRole('button', { name: 'Übernehmen' }).click();

	await expect(kim.getByText('Du hast diese Aufgabe übernommen.')).toBeVisible();
	await kim.goto('/');
	await expect(kim.getByRole('link', { name: TITLE })).toBeVisible();

	const lu = await as('lu');
	await lu.goto('/tasks');
	await expect(lu.getByText('Keine offenen Aufgaben')).toBeVisible();

	const alex = await as('admin');
	await alex.goto('/admin/tasks');
	await expect(alex.getByRole('listitem').filter({ hasText: TITLE })).toContainText(
		'Übernommen von Kim'
	);
});

test('two people, one task: the second gets a clear message', async ({ as }) => {
	// Alex releases Kim, so the task is open again
	const alex = await as('admin');
	await alex.goto('/admin/tasks');
	await alex.getByRole('link', { name: TITLE }).click();
	await alex.getByRole('button', { name: 'Freigeben' }).click();
	await expect(alex.getByText('Aufgabe freigegeben.')).toBeVisible();

	// Lu and Kim both open it; Kim confirms first
	const lu = await as('lu');
	const kim = await as('kim');
	for (const page of [lu, kim]) {
		await page.goto('/tasks');
		await page.getByRole('link', { name: TITLE }).click();
		await page.getByRole('button', { name: 'Übernehmen' }).click();
	}
	await kim.getByRole('dialog').getByRole('button', { name: 'Übernehmen' }).click();
	await expect(kim.getByText('Du hast diese Aufgabe übernommen.')).toBeVisible();

	await lu.getByRole('dialog').getByRole('button', { name: 'Übernehmen' }).click();
	await expect(lu.getByRole('alert')).toHaveText(
		'Die Aufgabe hat inzwischen jemand anderes übernommen.'
	);
});

test('Kim gives it back; deleted tasks disappear for members', async ({ as }) => {
	const kim = await as('kim');
	await kim.goto('/tasks');
	await kim.getByRole('link', { name: TITLE }).click();
	await kim.getByRole('button', { name: 'Wieder freigeben' }).click();
	await expect(kim.getByRole('button', { name: 'Übernehmen' })).toBeVisible();

	const alex = await as('admin');
	await alex.goto('/admin/tasks');
	await alex
		.getByRole('listitem')
		.filter({ hasText: TITLE })
		.getByRole('button', { name: 'Löschen' })
		.click();
	await expect(alex.getByText('Aufgabe gelöscht.', { exact: false })).toBeVisible();

	await kim.goto('/tasks');
	await expect(kim.getByRole('link', { name: TITLE })).toHaveCount(0);
});
