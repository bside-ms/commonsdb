<script lang="ts">
    import {toasts, dismiss, type Tone} from './toast.svelte';

    /** Rendered once, in the root layout. */
    const tones: Record<Tone, string> = {
        neutral: 'bg-ink text-paper',
        accent: 'bg-accent text-ink',
        danger: 'bg-paper text-danger border-danger'
    };
</script>

<div
        role="status"
        aria-live="polite"
        class="pointer-events-none fixed inset-x-4 bottom-4 z-100 flex flex-col items-center gap-2"
>
    {#each toasts.items as t (t.id)}
        <div
                class="pointer-events-auto flex max-w-[36rem] items-center gap-[13px] px-4 py-[13px] font-medium edge {tones[
				t.tone
			]}"
        >
            <span>{t.message}</span>
            <button type="button" class="cursor-pointer text-xl leading-none" onclick={() => dismiss(t.id)}>
                <span class="sr-only">Meldung schließen</span>
                <span aria-hidden="true">×</span>
            </button>
        </div>
    {/each}
</div>