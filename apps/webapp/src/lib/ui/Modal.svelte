<script lang="ts">
    import {Dialog} from 'bits-ui';
    import type {Snippet} from 'svelte';

    /**
     * Bits UI dialog. Focus trapping, focus return, scroll lock and
     * escape handling come from the primitive — callers never touch
     * any of it.
     */
    let {
        open = $bindable(false),
        title,
        description = '',
        children,
        footer
    }: {
        open?: boolean;
        title: string;
        description?: string;
        children: Snippet;
        footer?: Snippet;
    } = $props();
</script>

<Dialog.Root bind:open>
    <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/45"/>

        <Dialog.Content
                class="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-40px)] w-[min(32rem,calc(100vw-20px))] -translate-x-1/2 -translate-y-1/2 flex-col bg-paper edge"
        >
            <div class="flex items-start justify-between gap-[13px] border-b border-ink p-4">
                <div>
                    <Dialog.Title class="text-h2">{title}</Dialog.Title>
                    {#if description}
                        <Dialog.Description class="mt-1 text-tiny text-muted">
                            {description}
                        </Dialog.Description>
                    {/if}
                </div>

                <Dialog.Close class="cursor-pointer px-1 text-2xl leading-none">
                    <span class="sr-only">Schließen</span>
                    <span aria-hidden="true">×</span>
                </Dialog.Close>
            </div>

            <div class="overflow-y-auto p-4">{@render children()}</div>

            {#if footer}
                <div class="flex justify-end gap-2 border-t border-hair p-4">{@render footer()}</div>
            {/if}
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>