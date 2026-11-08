import { getContext, setContext } from 'svelte';

/** What a FormField hands to the control inside it. Getters, so it stays reactive. */
export type FieldContext = {
	readonly id: string;
	/** For controls a <label for> can't reach (e.g. the rich-text editor). */
	readonly labelId: string;
	readonly describedBy: string | undefined;
	readonly invalid: boolean;
};

const KEY = Symbol('ui.form-field');

export const setFieldContext = (ctx: FieldContext) => setContext(KEY, ctx);

/** undefined when the control is used outside a FormField. */
export const getFieldContext = () => getContext<FieldContext | undefined>(KEY);
