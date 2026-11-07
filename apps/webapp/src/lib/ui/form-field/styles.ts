import { tv } from '#lib/ui';

/** Shared look of Input, Textarea and Select. */
export const control = tv({
	base: [
		'block w-full rounded-none border border-ink bg-paper px-3 py-3 text-body text-ink',
		'focus:shadow-(--focus-field) focus:outline-none',
		'aria-invalid:border-danger',
		'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted'
	]
});
