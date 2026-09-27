<script lang="ts">
    import type {Snippet} from 'svelte';

    /**
     * A bordered surface on the canvas. The border is information:
     * it means "this is one thing". pad="none" when children manage
     * their own padding (a list of divided rows).
     */
    let {
        pad = 'md',
        class: extra = '',
        children
    }: { pad?: 'md' | 'sm' | 'none'; class?: string; children: Snippet } = $props();

    const padding = {md: 'p-4', sm: 'p-[13px]', none: ''};
</script>

<div class="bg-paper edge {padding[pad]} {extra}">{@render children()}</div>