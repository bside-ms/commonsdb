<script lang="ts">
    import type {HTMLTextareaAttributes} from 'svelte/elements';

    /** Multi-line input. Always used inside FormField. */
    let {
        value = $bindable(''),
        rows = 4,
        ...rest
    }: { value?: string } & HTMLTextareaAttributes = $props();
</script>

<textarea class="control-base min-h-[88px] resize-y font-sans" {rows} bind:value {...rest}
></textarea>