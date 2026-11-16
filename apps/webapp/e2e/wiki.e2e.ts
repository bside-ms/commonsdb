/**
 * Slice 6b, built-in wiki: Alex builds two pages, Kim reads and searches,
 * Alex edits and brings an old version back.
 */
import { expect, test } from './fixtures.ts';

test.describe.configure({ mode: 'serial' });

test('Alex creates a page and a subpage', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/wiki');
	await alex.getByRole('link', { name: 'Neue Seite' }).click();
	await alex.getByLabel('Titel').fill('Haus');
	await alex.getByRole('button', { name: 'Anlegen' }).click();
	await expect(alex).toHaveURL('/wiki/haus');

	await alex.getByRole('link', { name: 'Unterseite anlegen' }).click();
	await alex.getByLabel('Titel').fill('Schlüssel & Türen');
	await alex.getByRole('textbox', { name: 'Inhalt' }).fill('Der Kellerschlüssel hängt im Büro.');
	await alex.getByRole('button', { name: 'Anlegen' }).click();
	await expect(alex).toHaveURL('/wiki/schluessel-tueren');
	await expect(alex.getByRole('navigation', { name: 'Pfad' })).toContainText('Haus');
});

test('Kim finds it through the nav and the search', async ({ as }) => {
	const kim = await as('kim');
	await kim.goto('/');
	await kim.getByRole('link', { name: 'Wiki' }).click();
	await expect(kim.getByRole('link', { name: 'Schlüssel & Türen' })).toBeVisible();
	await expect(kim.getByRole('link', { name: 'Neue Seite' })).toHaveCount(0);

	await kim.getByLabel('Suche').fill('schlüssel');
	await kim.getByRole('button', { name: 'Suchen' }).click();
	await expect(kim.getByText(/Kellerschlüssel hängt im Büro/)).toBeVisible();
	await kim.getByRole('link', { name: 'Schlüssel & Türen' }).click();
	await expect(kim.getByRole('button', { name: 'Bearbeiten' })).toHaveCount(0);
});

test('Alex edits, then restores the first version', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/wiki/schluessel-tueren');
	await alex.getByRole('link', { name: 'Bearbeiten' }).click();
	await alex.getByLabel('Titel').fill('Schlüssel');
	await alex.getByRole('button', { name: 'Speichern' }).click();
	await expect(alex).toHaveURL('/wiki/schluessel-tueren');
	await expect(alex.getByRole('heading', { level: 1 })).toHaveText('Schlüssel');

	await alex.getByRole('link', { name: 'Versionen' }).click();
	await alex.getByRole('link', { name: /Schlüssel & Türen/ }).click();
	await alex.getByRole('button', { name: 'Diese Fassung wiederherstellen' }).click();
	await expect(alex.getByRole('heading', { level: 1 })).toHaveText('Schlüssel & Türen');
});

test('Alex links the page to a task; Kim reads it from there', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin/tasks/new');
	await alex.getByLabel('Titel', { exact: true }).fill('Keller aufräumen');
	await alex.getByLabel('Kategorie').selectOption({ label: 'Garten' });
	await alex.getByLabel('Datum', { exact: true }).fill('2030-07-01');
	await alex.getByLabel('Stunden').fill('1');
	await alex.getByLabel('Seite suchen').fill('keller');
	await alex.getByRole('button', { name: '„Schlüssel & Türen“ hinzufügen' }).click();
	await expect(alex.getByRole('list', { name: 'Verknüpfte Seiten' })).toContainText(
		'Schlüssel & Türen'
	);
	await alex.getByRole('button', { name: 'Anlegen' }).click();
	await expect(alex).toHaveURL('/admin/tasks');

	const kim = await as('kim');
	await kim.goto('/tasks');
	await kim.getByRole('link', { name: 'Keller aufräumen' }).click();
	const wiki = kim.getByRole('region', { name: 'Gut zu wissen' });
	await expect(wiki).toContainText('Kellerschlüssel hängt im Büro');
	await wiki.getByRole('link', { name: 'Schlüssel & Türen' }).click();
	await expect(kim).toHaveURL('/wiki/schluessel-tueren');
});
