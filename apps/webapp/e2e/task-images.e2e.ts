/**
 * Slice 6c step 2: an admin adds a photo to a task, members see it in the
 * list and on the task; without a photo the task shows a pattern.
 */
import { fileURLToPath } from 'node:url';
import { expect, test } from './fixtures.ts';

test.describe.configure({ mode: 'serial' });

const TITLE = 'Fahrradständer aufräumen';
const PHOTO = fileURLToPath(new URL('./files/photo-with-gps.jpg', import.meta.url));

test('Alex adds a photo; a wrong file shows at the field and nothing is lost', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin/tasks/new');
	await alex.getByLabel('Titel', { exact: true }).fill(TITLE);
	await alex.getByLabel('Kategorie').selectOption({ label: 'Garten' });
	await alex.getByLabel('Datum', { exact: true }).fill('2030-06-01');
	await alex.getByLabel('Stunden').fill('2');
	await alex.getByLabel('Was ist auf dem Foto? (optional)').fill('Volle Fahrradständer vorm Haus');

	await alex.getByLabel('Foto (optional)').setInputFiles({
		name: 'notizen.txt',
		mimeType: 'image/jpeg', // the browser's claim doesn't count, the bytes do
		buffer: Buffer.from('kein Bild')
	});
	await alex.getByRole('button', { name: 'Anlegen' }).click();
	await expect(alex.getByText('Dieses Dateiformat geht nicht.', { exact: false })).toBeVisible();
	await expect(alex.getByLabel('Titel', { exact: true })).toHaveValue(TITLE);

	await alex.getByLabel('Foto (optional)').setInputFiles(PHOTO);
	// previewed before anything is uploaded
	await expect(alex.locator('img[src^="blob:"]')).toBeVisible();
	await alex.getByRole('button', { name: 'Anlegen' }).click();

	await expect(alex).toHaveURL('/admin/tasks');
	await expect(
		alex.getByRole('listitem').filter({ hasText: TITLE }).locator('img[src^="/media/"]')
	).toBeVisible();
});

test('Kim sees the photo on the card and, described, on the task', async ({ as }) => {
	const kim = await as('kim');
	await kim.goto('/tasks');
	const card = kim.getByRole('link', { name: TITLE });
	// decorative on the card: the title names the link
	const thumb = card.locator('img');
	await expect(thumb).toHaveAttribute('alt', '');
	await expect(thumb).toHaveAttribute('src', /\/media\/[0-9a-f-]+\/thumb$/);

	await card.click();
	const photo = kim.getByRole('img', { name: 'Volle Fahrradständer vorm Haus' });
	await expect(photo).toBeVisible();
	const res = await kim.request.get((await photo.getAttribute('src'))!);
	expect(res.status()).toBe(200);
	expect(res.headers()['content-type']).toBe('image/webp');
	expect((await res.body()).includes('PhoneCo')).toBe(false);
});

test('Alex removes it; Kim sees the pattern instead', async ({ as }) => {
	const alex = await as('admin');
	await alex.goto('/admin/tasks');
	await alex.getByRole('link', { name: TITLE }).click();
	await alex.getByLabel('Foto entfernen').check();
	await alex.getByRole('button', { name: 'Speichern' }).click();
	await expect(alex).toHaveURL('/admin/tasks');

	const kim = await as('kim');
	await kim.goto('/tasks');
	const card = kim.getByRole('link', { name: TITLE });
	await expect(card.locator('img')).toHaveCount(0);
	await expect(card.locator('.ph')).toBeVisible();

	// leave the list as the other files expect it
	await alex.goto('/admin/tasks');
	const row = alex.getByRole('listitem').filter({ hasText: TITLE });
	await row.getByRole('button', { name: 'Löschen' }).click();
	await expect(row).toHaveCount(0);
});
