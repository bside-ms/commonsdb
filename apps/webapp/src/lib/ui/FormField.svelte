<script lang="ts">
    import type {Snippet} from 'svelte';

    /**
     * label + control + hint + error, with the aria plumbing owned
     * here so no caller has to remember it.
     *
     *   <FormField label="E-Mail" hint="Nur für Aufgaben-Infos.">
     *     {#snippet control(props)}
     *       <TextInput type="email" bind:value={email} {...props} />
     *     {/snippet}
     *   </FormField>
     */
    type ControlProps = {
        id: string;
        'aria-describedby'?: string;
        'aria-invalid'?: 'true' | undefined;
        required: boolean;
    };

    let {
        label,
        hint = '',
        error = '',
        required = false,
        control
    }: {
        label: string;
        hint?: string;
        error?: string;
        required?: boolean;
        control: Snippet<[ControlProps]>;
    } = $props();

    const uid = $props.id();
    const hintId = `${uid}-hint`;
    const errorId = `${uid}-error`;

    const describedBy = $derived(
        [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
    );
</script>

<div class="[&+&]:mt-4">
    <label for={uid} class="mb-1 block text-tiny font-semibold">
        {label}
        {#if required}<span aria-hidden="true"> *</span><span class="sr-only">
				(Pflichtfeld)</span
        >{/if}
    </label>

    {@render control({
        id: uid,
        'aria-describedby': describedBy,
        'aria-invalid': error ? 'true' : undefined,
        required
    })}

    {#if hint}<p id={hintId} class="mt-1 text-micro text-muted">{hint}</p>{/if}
    {#if error}<p id={errorId} class="mt-1 text-micro font-semibold text-danger">{error}</p>{/if}
</div>