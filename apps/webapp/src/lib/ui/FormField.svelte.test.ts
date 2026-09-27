import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import FormField from './FormField.svelte';

/**
 * Tests the aria contract, not the styling.
 *
 * "Does it render bg-accent" is a test of our own CSS: it breaks on
 * every restyle and catches nothing. "Is the error announced to a
 * screen reader" is a real regression that is invisible in review.
 */

const input = createRawSnippet<[Record<string, string>]>((props) => ({
	render: () => {
		const p = props();
		const attrs = Object.entries(p)
			.filter(([, v]) => v !== undefined && v !== false)
			.map(([k, v]) => `${k}="${v}"`)
			.join(' ');
		return `<input ${attrs} />`;
	}
}));

describe('FormField', () => {
	it('connects the label to the control', async () => {
		const screen = render(FormField, { label: 'E-Mail', control: input });
		await expect.element(screen.getByLabelText('E-Mail')).toBeInTheDocument();
	});

	it('describes the control with the hint', async () => {
		const screen = render(FormField, {
			label: 'E-Mail',
			hint: 'Only used for task notifications.',
			control: input
		});

		const field = screen.getByLabelText('E-Mail');
		const describedBy = (await field.element()).getAttribute('aria-describedby');

		expect(describedBy).toBeTruthy();
		expect(document.getElementById(describedBy!)?.textContent).toContain(
			'Only used for task notifications.'
		);
	});

	it('marks the control invalid and announces the error', async () => {
		const screen = render(FormField, {
			label: 'E-Mail',
			error: 'This address is already registered.',
			control: input
		});

		const field = screen.getByLabelText('E-Mail');
		await expect.element(field).toHaveAttribute('aria-invalid', 'true');

		const describedBy = (await field.element()).getAttribute('aria-describedby');
		expect(document.getElementById(describedBy!)?.textContent).toContain('already registered');
	});

	it('references both hint and error when both are present', async () => {
		const screen = render(FormField, {
			label: 'E-Mail',
			hint: 'A hint.',
			error: 'An error.',
			control: input
		});

		const ids = (await screen.getByLabelText('E-Mail').element())
			.getAttribute('aria-describedby')!
			.split(' ');

		expect(ids).toHaveLength(2);
	});

	it('marks required fields for screen readers as well as visually', async () => {
		const screen = render(FormField, { label: 'E-Mail', required: true, control: input });
		await expect.element(screen.getByText('(Pflichtfeld)')).toBeInTheDocument();
	});
});
