<script lang="ts">
    import type {Snippet} from 'svelte';
    import type {HTMLButtonAttributes} from 'svelte/elements';

    /** A toggleable filter. Interactive by definition — for a static
     label use Badge. */
    let {
        active = false,
        size = 'md',
        children,
        ...rest
    }: { active?: boolean; size?: 'md' | 'sm'; children: Snippet } & HTMLButtonAttributes = $props();

    const sizes = {
        md: 'px-[15px] py-[9px] text-[0.875rem] font-semibold',
        sm: 'px-[11px] py-1.5 text-tiny font-medium'
    };

    const on = size === 'md' ? 'bg-accent text-ink' : 'bg-ink text-paper';
</script>

<button
        type="button"
        aria-pressed={active}
        class="edge cursor-pointer whitespace-nowrap {sizes[size]} {active ? on : 'bg-paper'}"
        {...rest}>{@render children()}</button
>