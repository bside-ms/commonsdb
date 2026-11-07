<!--
	@component
	White box with an ink border. Optional header strip (title + actions),
	as on the admin cards. Without header it's the prototype's plain `.box`.

	<Card title="Zu bestätigen">
		{#snippet actions()}<Button size="sm" variant="ghost">Alle ansehen</Button>{/snippet}
		…
	</Card>
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../utils.ts';

	type Props = Omit<HTMLAttributes<HTMLElement>, 'class' | 'title'> & {
		title?: string;
		/** Heading level of the title, so it fits the page outline. */
		level?: 2 | 3 | 4;
		actions?: Snippet;
		/** Set false for content that brings its own padding (tables, lists). */
		padded?: boolean;
		class?: string;
		children: Snippet;
	};

	let {
		title,
		level = 2,
		actions,
		padded = true,
		class: className,
		children,
		...rest
	}: Props = $props();
</script>

<section {...rest} class={cn('border border-ink bg-paper', className)}>
	{#if title || actions}
		<header class="flex items-center justify-between gap-3 border-b border-ink px-4 py-3.25">
			{#if title}
				<svelte:element this={`h${level}`} class="text-h3">{title}</svelte:element>
			{/if}
			{#if actions}<div class="flex flex-wrap gap-2">{@render actions()}</div>{/if}
		</header>
	{/if}
	<div class={padded ? 'p-4' : ''}>
		{@render children()}
	</div>
</section>
