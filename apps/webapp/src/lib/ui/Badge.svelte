<script lang="ts">
    import type {Snippet} from 'svelte';

    /**
     * A static status marker. Colour never carries meaning alone —
     * a badge always contains its own text.
     */
    type Tone = 'accent' | 'neutral' | 'grass' | 'pink' | 'sky' | 'outline';

    let {tone = 'accent', children}: { tone?: Tone; children: Snippet } = $props();

    const tones: Record<Tone, string> = {
        accent: 'bg-accent',
        neutral: 'bg-[#e4e2de]',
        grass: 'bg-grass',
        pink: 'bg-pink',
        sky: 'bg-sky',
        outline: 'bg-paper edge'
    };
</script>

<span
        class="inline-block px-1.5 py-[3px] text-[0.6875rem] font-semibold tracking-[0.08em] text-ink uppercase {tones[
		tone
	]}">{@render children()}</span
>