<script lang="ts">
    import type {HTMLInputAttributes} from 'svelte/elements';

    /** Single-line input. Always used inside FormField. */
    let {
        value = $bindable(''),
        type = 'text',
        ...rest
    }: { value?: string } & HTMLInputAttributes = $props();
</script>

<input class="control-base" {type} bind:value {...rest}/>