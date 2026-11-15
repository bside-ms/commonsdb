/**
 * Slice 4 end to end: a task with several shifts, two of them in
 * parallel, one past midnight. Kim and Lu each take one, see each other,
 * and the admin can't move a shift that someone holds. Serial, like
 * tasks.e2e.ts; the task is deleted at the end so other files don't see it.
 */
import { expect, test } from './fixtures.ts';

test.describe.configure({ mode: 'serial' });

const TITLE = 'Sommerfest auf- und abbauen';

test('admin creates a task with three shifts', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin/tasks/new');

	await alex.getByLabel('Titel', { exact: true }).fill(TITLE);
	await alex.getByLabel('Kategorie').selectOption({ label: 'Garten' });
	await alex.getByLabel('Datum', { exact: true }).fill('2030-07-04');

	const from = alex.getByLabel(/^Von/);
	const to = alex.getByLabel(/^Bis \(/); // "Bis (optional)"; plain "Bis" is the range end
	const hours = alex.getByLabel('Stunden');

	await from.nth(0).fill('10:00');
	await to.nth(0).fill('12:00');
	await hours.nth(0).fill('2');
	await alex.getByRole('button', { name: 'Schicht hinzufügen' }).click();
	await from.nth(1).fill('10:00');
	await to.nth(1).fill('12:00');
	await hours.nth(1).fill('2');
	await alex.getByRole('button', { name: 'Schicht hinzufügen' }).click();
	await from.nth(2).fill('22:00');
	await to.nth(2).fill('02:00');
	await hours.nth(2).fill('4');
	await expect(alex.getByText('Endet am nächsten Tag.')).toBeVisible();

	await alex.getByRole('button', { name: 'Anlegen' }).click();
	await expect(alex).toHaveURL('/admin/tasks');
	const row = alex.getByRole('listitem').filter({ hasText: TITLE });
	await expect(row).toContainText('3 Schichten');
	await expect(row).toContainText('3 von 3 frei');
});

test('Kim takes the night shift, Lu a morning one; they see each other', async ({ as }) => {
	const kim = await as('kim');
	await kim.goto('/tasks');
	await expect(kim.getByRole('link', { name: TITLE })).toContainText('Gemeinsam');
	await kim.getByRole('link', { name: TITLE }).click();
	await expect(kim.getByText('Bis zu 2 Leute gleichzeitig.')).toBeVisible();

	await kim.getByLabel(/22:00–02:00/).check();
	await kim.getByRole('button', { name: 'Übernehmen' }).click();
	await kim.getByRole('dialog').getByRole('button', { name: 'Übernehmen' }).click();
	await expect(kim.getByText('Du hast diese Aufgabe übernommen.')).toBeVisible();

	const lu = await as('lu');
	await lu.goto('/tasks');
	await expect(lu.getByRole('link', { name: TITLE })).toContainText('2 von 3 frei');
	await lu.getByRole('link', { name: TITLE }).click();
	const shifts = lu.getByRole('region', { name: 'Schichten' });
	await expect(shifts).toContainText('Kim');

	// first free shift is preselected
	await lu.getByRole('button', { name: 'Übernehmen' }).click();
	await lu.getByRole('dialog').getByRole('button', { name: 'Übernehmen' }).click();
	await expect(lu.getByText('Du hast diese Aufgabe übernommen.')).toBeVisible();
	await expect(shifts).toContainText('Kim');
	await expect(shifts).toContainText('Du');

	await kim.reload();
	await expect(kim.getByRole('region', { name: 'Schichten' })).toContainText('Lu');
});

test('admin sees both; a held shift keeps its time; then the task goes', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin/tasks');
	await expect(alex.getByRole('listitem').filter({ hasText: TITLE })).toContainText('1 von 3 frei');
	await alex.getByRole('link', { name: TITLE }).click();

	const held = alex.locator('section').filter({ hasText: 'Vergebene Schichten' });
	await expect(held).toContainText('Übernommen von Kim');
	await expect(held).toContainText('Übernommen von Lu');

	// rows are ordered by start time: 10:00, 10:00, 22:00 (Kim's)
	await expect(alex.getByLabel(/^Von/).nth(2)).toHaveAttribute('readonly');
	await expect(alex.getByText('Vergeben: Uhrzeit fest', { exact: false })).toHaveCount(2);

	await alex.getByRole('button', { name: 'Löschen' }).click();
	await expect(alex.getByText('Aufgabe gelöscht.', { exact: false })).toBeVisible();
});
