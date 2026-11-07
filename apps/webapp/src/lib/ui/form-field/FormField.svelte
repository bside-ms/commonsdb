<!--
	@component
	Label + control + hint + error. Wires id, aria-describedby and
	aria-invalid into the Input/Textarea/Select placed inside it.

	<FormField label={m.profile_display_name()} error={fields.displayName && errorMessage(fields.displayName)}>
		<Input name="displayName" value={values.displayName} required />
	</FormField>

	`error` takes the translated message, not the code. Map codes with
	errorMessage() in the route, so ui/ stays independent of core.
-->
<script lang="ts">
    import type {Snippet} from 'svelte';
    import {m} from '#lib/paraglide/messages.js';
    import {cn} from '#lib/ui';
    import {setFieldContext} from './context.ts';

    type Props = {
        label: string;
        hint?: string;
        error?: string | null | false;
        /** Shows "(optional)" after the label. */
        optional?: boolean;
        /** Override the generated id, e.g. to link from elsewhere. */
        id?: string;
        class?: string;
        children: Snippet;
    };

    let {label, hint, error, optional = false, id, class: className, children}: Props = $props();

    const uid = $props.id();
    const fieldId = $derived(id ?? `${uid}-control`);
    const hintId = $derived(`${fieldId}-hint`);
    const errorId = $derived(`${fieldId}-error`);

    setFieldContext({
        get id() {
            return fieldId;
        },
        get describedBy() {
            return [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
        },
        get invalid() {
            return Boolean(error);
        }
    });
</script>

<div class={cn('grid content-start gap-1.25', className)}>
    <label for={fieldId} class="text-tiny font-semibold">
        {label}
        {#if optional}<span class="font-normal text-muted">({m.ui_optional()})</span>{/if}
    </label>

    {@render children()}

    {#if hint}
        <p id={hintId} class="text-tiny text-muted">{hint}</p>
    {/if}
    {#if error}
        <p id={errorId} class="text-tiny font-semibold text-danger">{error}</p>
    {/if}
</div>
