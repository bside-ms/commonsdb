<script lang="ts">
    import type {Snippet} from 'svelte';

    /** An empty screen is an invitation to act, so this takes an
     action rather than only explaining the emptiness. */
    let {
        title,
        description = '',
        action
    }: { title: string; description?: string; action?: Snippet } = $props();
</script>

<div class="border border-hair bg-paper px-5 py-10 text-center">
    <h3>{title}</h3>
    {#if description}
        <p class="mx-auto mt-2 max-w-[46ch] text-muted">{description}</p>
    {/if}
    {#if action}
        <div class="mt-4">{@render action()}</div>
    {/if}
</div>