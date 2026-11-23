/**
 * Slice 6c step 3 (the roadmap demo): Kim sets a profile picture visible
 * to admins only; Lu sees initials, Alex sees the picture. Removing it
 * deletes the file.
 */
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

test.describe.configure({ mode: 'serial' });

const PHOTO = fileURLToPath(new URL('./files/photo-with-gps.jpg', import.meta.url));
let photoUrl = '';

/** Kim's row in the "new message" people list, as `page` sees it. */
async function kimInPeopleList(page: Page) {
	await page.goto('/messages/new');
	await page.getByPlaceholder('Namen suchen').fill('Kim');
	return page.locator('label').filter({ has: page.getByText('Kim', { exact: true }) });
}

async function setPhotoVisibility(page: Page, label: string) {
	await page.goto('/profile/edit');
	await page.getByLabel('Wer sieht mein Foto?').selectOption({ label });
	await page.getByRole('button', { name: 'Speichern' }).click();
	await expect(page).toHaveURL('/profile');
}

test('Kim uploads a picture; a wrong file is refused at the field', async ({ as }) => {
	const kim = await as('kim');
	await kim.goto('/profile');
	await kim.getByLabel('Bild auswählen').setInputFiles({
		name: 'ich.jpg',
		mimeType: 'image/jpeg',
		buffer: Buffer.from('kein Bild')
	});
	await kim.getByRole('button', { name: 'Hochladen' }).click();
	await expect(kim.getByText('Dieses Dateiformat geht nicht.', { exact: false })).toBeVisible();

	await kim.getByLabel('Bild auswählen').setInputFiles(PHOTO);
	await kim.getByRole('button', { name: 'Hochladen' }).click();
	await expect(kim.getByText('Profilbild gespeichert.')).toBeVisible();

	// the shell's avatar updates too
	const headerAvatar = kim.locator('header img[src*="/media/"]');
	await expect(headerAvatar).toBeVisible();
	// absolute for request.get; pages may render it relative ('../media/…')
	photoUrl = new URL((await headerAvatar.getAttribute('src'))!, kim.url()).pathname;
	await expect(kim.getByLabel('Anderes Bild')).toBeVisible();
	await expect(kim.getByText('Alle Mitglieder sehen dein Bild.')).toBeVisible();
});

test('visible to admins only: Lu sees initials, Alex the picture', async ({ as }) => {
	const kim = await as('kim');
	await setPhotoVisibility(kim, 'Nur Admins');
	await expect(kim.getByText('Nur Admins sehen dein Bild.')).toBeVisible();

	const lu = await as('lu');
	const forLu = await kimInPeopleList(lu);
	await expect(forLu).toBeVisible();
	await expect(forLu.locator('img')).toHaveCount(0);
	expect((await lu.request.get(photoUrl)).status()).toBe(404);

	const alex = await as('admin');
	const forAlex = await kimInPeopleList(alex);
	await expect(forAlex.locator('img')).toHaveAttribute('src', new RegExp(`${photoUrl}$`));
	expect((await alex.request.get(photoUrl)).status()).toBe(200);
});

test('nobody: not even a superadmin; Kim still sees her own', async ({ as }) => {
	const kim = await as('kim');
	await setPhotoVisibility(kim, 'Niemand');
	expect((await (await as('superadmin')).request.get(photoUrl)).status()).toBe(404);
	expect((await kim.request.get(photoUrl)).status()).toBe(200);
});

test('Kim removes it; the file is gone', async ({ as }) => {
	const kim = await as('kim');
	await kim.goto('/profile');
	await kim.getByRole('button', { name: 'Bild entfernen' }).click();
	await expect(kim.getByText('Profilbild entfernt.', { exact: false })).toBeVisible();
	await expect(kim.locator('header img[src*="/media/"]')).toHaveCount(0);
	expect((await kim.request.get(photoUrl)).status()).toBe(404);

	// leave Kim as the other files expect her
	await setPhotoVisibility(kim, 'Alle Mitglieder');
});
