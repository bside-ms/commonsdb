/**
 * The slice 3 demo, end to end: take, do, report, confirm, repros land.
 * Plus the detours: a report sent back, hours corrected on confirmation,
 * the hours lock, and a manual correction by a superadmin.
 *
 * Runs before tasks.e2e.ts (workers: 1, alphabetical). It must not leave
 * an open task behind: tasks.e2e.ts expects Lu's list to be empty.
 */
import { expect, test } from './fixtures.ts';

test.describe.configure({ mode: 'serial' });

const TITLE = 'Kompost umsetzen';

test('Alex puts a task in, Kim takes it and reports it done', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin/tasks/new');
	await alex.getByLabel('Titel', { exact: true }).fill(TITLE);
	await alex.getByLabel('Kategorie').selectOption({ label: 'Garten' });
	await alex.getByLabel('Datum', { exact: true }).fill('2030-06-01');
	await alex.getByLabel('Stunden').fill('2');
	await alex.getByRole('button', { name: 'Anlegen' }).click();
	await expect(alex).toHaveURL('/admin/tasks');

	const kim = await as('kim');
	await kim.goto('/tasks');
	await kim.getByRole('link', { name: TITLE }).click();
	await kim.getByRole('button', { name: 'Übernehmen' }).click();
	await kim.getByRole('dialog').getByRole('button', { name: 'Übernehmen' }).click();

	await kim.getByLabel('Notiz (optional)').fill('Halb geschafft, Schubkarre war platt.');
	await kim.getByRole('button', { name: 'Erledigt melden' }).click();
	await expect(kim.getByText('Sie wartet jetzt auf Bestätigung.', { exact: false })).toBeVisible();

	// still on Kim's start page, now marked as reported
	await kim.goto('/');
	await expect(kim.getByRole('link', { name: TITLE })).toContainText('Gemeldet');
});

test('Alex sends it back; Kim sees why and reports again', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin/confirmations');
	const row = alex.getByRole('listitem').filter({ hasText: TITLE });
	await expect(row).toContainText('Gemeldet von Kim');
	await expect(row).toContainText('Schubkarre war platt');

	await row.getByText('Zurückgeben', { exact: true }).click();
	await row.getByLabel('Begründung').fill('Bitte noch die zweite Miete umsetzen.');
	await row.getByRole('button', { name: 'Meldung zurückgeben' }).click();
	await expect(alex.getByText('Nichts zu bestätigen')).toBeVisible();

	const kim = await as('kim');
	await kim.goto('/tasks');
	await kim.getByRole('link', { name: TITLE }).click();
	await expect(
		kim.getByRole('status').filter({ hasText: 'Bitte noch einmal ansehen' })
	).toContainText('zweite Miete');

	await kim.getByLabel('Notiz (optional)').fill('Beide Mieten umgesetzt, hat länger gedauert.');
	await kim.getByRole('button', { name: 'Erledigt melden' }).click();
	await expect(kim.getByText('Sie wartet jetzt auf Bestätigung.', { exact: false })).toBeVisible();
	await expect(
		kim.getByRole('status').filter({ hasText: 'Bitte noch einmal ansehen' })
	).toHaveCount(0);
});

test('Alex confirms with corrected hours and a thank-you', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin/confirmations');
	const row = alex.getByRole('listitem').filter({ hasText: TITLE });
	await expect(row.getByLabel('Stunden')).toHaveValue('2');

	await row.getByLabel('Stunden').fill('2,5');
	await row.getByLabel('Dankeschön (optional)').fill('Danke, Kim! Der Kompost sieht super aus.');
	await row.getByRole('button', { name: 'Bestätigen', exact: true }).click();
	await expect(alex.getByText('Nichts zu bestätigen')).toBeVisible();

	await alex.goto('/admin/tasks');
	await expect(alex.getByRole('listitem').filter({ hasText: TITLE })).toContainText('Bestätigt');
});

test('repros land: balance, entry, thanks; the task leaves Kim’s lists', async ({ as }) => {
	const kim = await as('kim');
	await kim.goto('/');
	await expect(kim.getByRole('link', { name: /2,5\s*Repros/ })).toBeVisible();
	await expect(kim.getByRole('link', { name: TITLE })).toHaveCount(0);

	await kim.getByRole('link', { name: /2,5\s*Repros/ }).click();
	await expect(kim).toHaveURL('/account');
	const entry = kim.getByRole('listitem').filter({ hasText: TITLE });
	await expect(entry).toContainText('+2,5');
	await expect(entry).toContainText('Der Kompost sieht super aus.');
	await expect(entry).toContainText('Danke von Alex Admin');

	// the entry links back to the task, which shows it as done
	await entry.getByRole('link', { name: TITLE }).click();
	await expect(kim.getByText('Erledigt und bestätigt.', { exact: false })).toBeVisible();
});

test('confirmed hours are locked on the task form', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin/tasks');
	await alex.getByRole('link', { name: TITLE }).click();
	await alex.getByLabel('Stunden').fill('3');
	await alex.getByRole('button', { name: 'Speichern' }).click();
	await expect(alex.getByText('Die Stunden sind bestätigt', { exact: false })).toBeVisible();
});

test('only superadmins correct balances; Kim sees the correction', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin/tasks');
	await expect(alex.getByRole('link', { name: 'Mitglieder' })).toHaveCount(0);
	await alex.goto('/admin/members');
	await expect(alex.getByRole('heading', { level: 1 })).toHaveText('403');

	const sascha = await as('superadmin');
	await sascha.goto('/admin/members');
	const row = sascha.getByRole('listitem').filter({ hasText: 'kim@e2e.test' });
	await expect(row).toContainText('2,5 Repros');

	await row.getByText('Korrigieren', { exact: true }).click();
	await row.getByLabel('Repros').fill('-0,5');
	await row.getByLabel('Grund').fill('Pause war mitgezählt.');
	await row.getByRole('button', { name: 'Buchen' }).click();
	await expect(row).toContainText('2 Repros');

	const kim = await as('kim');
	await kim.goto('/account');
	const correction = kim.getByRole('listitem').filter({ hasText: 'Korrektur' });
	await expect(correction).toContainText('−0,5');
	await expect(correction).toContainText('Pause war mitgezählt.');
});
