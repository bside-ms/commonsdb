import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from '@vitest/browser/context';
import ModalHarness from './ModalHarness.test.svelte';

/**
 * Focus behaviour comes from Bits UI, so this is really a contract
 * test against the dependency: if a Bits UI upgrade changes focus
 * return or escape handling, this fails instead of a user finding it.
 *
 * Worth having precisely because it is not our code.
 */
describe('Modal', () => {
	it('moves focus into the dialog and returns it on close', async () => {
		const screen = render(ModalHarness);

		const trigger = screen.getByRole('button', { name: 'Open' });
		await trigger.click();

		const dialog = screen.getByRole('dialog');
		await expect.element(dialog).toBeInTheDocument();
		expect(dialog.element().contains(document.activeElement)).toBe(true);

		await userEvent.keyboard('{Escape}');

		await expect.element(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
		await expect.element(trigger).toHaveFocus();
	});

	it('labels the dialog with its title', async () => {
		const screen = render(ModalHarness);
		await screen.getByRole('button', { name: 'Open' }).click();

		await expect.element(screen.getByRole('dialog', { name: 'Confirm shift' })).toBeInTheDocument();
	});
});
