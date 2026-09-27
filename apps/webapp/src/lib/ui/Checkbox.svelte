<script lang="ts">
    import {Checkbox} from 'bits-ui';

    /** Owns its own label, so it is not wrapped in FormField. */
    let {
        checked = $bindable(false),
        label,
        hint = '',
        ...rest
    }: { checked?: boolean; label: string; hint?: string } & Record<string, unknown> = $props();

    const uid = $props.id();
</script>

<div class="flex items-start gap-2.5">
    <Checkbox.Root
            id={uid}
            bind:checked
            class="mt-0.5 flex size-5 flex-none cursor-pointer items-center justify-center bg-paper edge data-[state=checked]:bg-accent"
            {...rest}
    >
        {#snippet children({checked})}
            {#if checked}<span aria-hidden="true" class="text-tiny leading-none font-semibold">✓</span
            >{/if}
        {/snippet}
    </Checkbox.Root>

    <div>
        <label for={uid} class="cursor-pointer font-medium">{label}</label>
        {#if hint}<p class="mt-0.5 text-micro text-muted">{hint}</p>{/if}
    </div>
</div>