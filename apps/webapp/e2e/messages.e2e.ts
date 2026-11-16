/**
 * Slice 6a, member side: write to someone, see it arrive as unread,
 * answer with Enter, block, unblock. Leaves no tasks behind (tasks.e2e.ts
 * expects Lu's task list to be empty).
 */
import { expect, test } from './fixtures.ts';

test.describe.configure({ mode: 'serial' });

test('Kim writes to Lu; Lu sees it unread and answers with Enter', async ({ as }) => {
	const kim = await as('kim');
	await kim.goto('/messages/new');
	await kim.getByPlaceholder('Namen suchen').fill('Lu');
	await kim.getByRole('checkbox', { name: 'Lu' }).check();
	await kim.getByRole('textbox', { name: 'Nachricht' }).fill('Hast du morgen Zeit für den Garten?');
	await kim.getByRole('button', { name: 'Senden' }).click();
	await expect(kim).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
	await expect(kim.getByRole('heading', { level: 1 })).toHaveText('Lu');

	const lu = await as('lu');
	await lu.goto('/');
	await expect(lu.getByRole('link', { name: 'Postfach 1 ungelesen' })).toBeVisible();
	await lu.getByRole('link', { name: 'Postfach 1 ungelesen' }).click();
	await lu.getByRole('link', { name: /Kim/ }).click();
	await expect(lu.getByText('Hast du morgen Zeit für den Garten?')).toBeVisible();
	// opening the conversation cleared the badge
	await expect(
		lu.getByRole('navigation').getByRole('link', { name: 'Postfach', exact: true })
	).toBeVisible();

	const reply = lu.getByRole('textbox', { name: 'Antworten' });
	await reply.fill('Ja, ab 10 Uhr.');
	await reply.press('Enter');
	await expect(lu.getByRole('listitem').filter({ hasText: 'Ja, ab 10 Uhr.' })).toContainText('Du');
	await expect(reply).toHaveText('');

	await kim.reload();
	await expect(kim.getByText('Ja, ab 10 Uhr.')).toBeVisible();
});

test('Lu blocks Kim; Kim can no longer write; Lu unblocks in the profile', async ({ as }) => {
	const lu = await as('lu');
	await lu.goto('/messages');
	await lu.getByRole('link', { name: /Kim/ }).click();
	await lu.getByRole('button', { name: 'Person blockieren' }).click();
	await lu.getByRole('dialog').getByRole('button', { name: 'Person blockieren' }).click();
	await expect(lu.getByText('Kim ist blockiert.')).toBeVisible();

	const kim = await as('kim');
	await kim.goto('/messages');
	await kim.getByRole('link', { name: /Lu/ }).click();
	await expect(
		kim.getByText('Nachrichten an diese Person sind gerade nicht möglich.')
	).toBeVisible();
	await kim.goto('/messages/new');
	await expect(kim.getByRole('checkbox', { name: 'Lu' })).toHaveCount(0);

	await lu.goto('/profile');
	await lu.getByRole('button', { name: 'Aufheben' }).click();
	await expect(lu.getByText('Du hast niemanden blockiert.')).toBeVisible();

	await kim.reload();
	await expect(kim.getByRole('checkbox', { name: 'Lu' })).toBeVisible();
});

test('Kim asks the admins about nothing in particular', async ({ as }) => {
	const kim = await as('kim');
	await kim.goto('/messages/admins');
	await kim.getByLabel('Betreff (optional)').fill('Schlüssel');
	await kim.getByRole('textbox', { name: 'Nachricht' }).fill('Wo hängt der Kellerschlüssel?');
	await kim.getByRole('button', { name: 'Senden' }).click();
	await expect(kim.getByRole('heading', { level: 1 })).toHaveText('Schlüssel');
	await expect(kim.getByText('Noch kümmert sich niemand')).toBeVisible();
});
