<!--
	@component
	A photo, or a pattern standing in for one (stripes, dots, grid, blocks,
	waves in an area colour, as in the prototype). The pattern comes from
	`seed`, so the same thing always looks the same.

	`alt`: what the photo shows. Empty means decorative (hidden from screen
	readers); the pattern is always decorative.

	<Thumb seed={task.id} />
	<Thumb seed={task.id} src={url} alt="Die Hecke am Tor" size="lg" />
-->
<script lang="ts" module>
	export const THUMB_PATTERNS = ['stripes', 'dots', 'grid', 'blocks', 'waves'] as const;
	export const THUMB_COLORS = [
		'area-start',
		'area-tasks',
		'area-commons',
		'area-init',
		'area-qual'
	] as const;

	/** Stable pattern and colour for a seed; spread so neighbours differ. */
	export function placeholderFor(seed: string) {
		let hash = 0;
		for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
		const n = Math.abs(hash);
		return {
			pattern: THUMB_PATTERNS[n % THUMB_PATTERNS.length],
			color: THUMB_COLORS[Math.floor(n / THUMB_PATTERNS.length) % THUMB_COLORS.length]
		};
	}
</script>

<script lang="ts">
	import { tv } from '../utils.ts';

	const thumb = tv({
		base: 'block shrink-0 overflow-hidden border border-ink bg-paper',
		variants: {
			size: {
				sm: 'h-16 w-21',
				lg: 'h-50 w-full'
			}
		},
		defaultVariants: { size: 'sm' }
	});

	type Props = {
		/** Picks the placeholder pattern. Use something stable, e.g. the task id. */
		seed: string;
		src?: string | null;
		alt?: string | null;
		size?: 'sm' | 'lg';
		class?: string;
	};

	let { seed, src, alt, size, class: className }: Props = $props();

	const ph = $derived(placeholderFor(seed));

	// a missing or broken file falls back to the pattern
	let failed = $state(false);
	$effect(() => {
		void src;
		failed = false;
	});
</script>

{#if src && !failed}
	<img
		{src}
		alt={alt ?? ''}
		loading="lazy"
		decoding="async"
		class={thumb({ size, class: ['object-cover', className] })}
		onerror={() => (failed = true)}
	/>
{:else}
	<span
		class={thumb({ size, class: ['ph', `ph-${ph.pattern}`, className] })}
		style:--ph="var(--color-{ph.color})"
		aria-hidden="true"
	></span>
{/if}

<style>
	.ph {
		background-color: var(--color-paper);
	}
	.ph-stripes {
		background-image: repeating-linear-gradient(
			45deg,
			var(--ph) 0 9px,
			var(--color-paper) 9px 18px
		);
	}
	.ph-dots {
		background-image: radial-gradient(var(--ph) 32%, var(--color-paper) 33%);
		background-size: 16px 16px;
	}
	.ph-grid {
		background-image:
			repeating-linear-gradient(0deg, var(--color-paper) 0 13px, var(--ph) 13px 15px),
			repeating-linear-gradient(90deg, var(--color-paper) 0 13px, var(--ph) 13px 15px);
	}
	.ph-blocks {
		background-image: linear-gradient(135deg, var(--ph) 0 50%, var(--color-paper) 50% 100%);
	}
	.ph-waves {
		background-image: repeating-linear-gradient(
			-45deg,
			var(--ph) 0 5px,
			var(--color-paper) 5px 14px
		);
	}
</style>
