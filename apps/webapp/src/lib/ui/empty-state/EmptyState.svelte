<!--
	@component
	Placeholder for empty lists and not-yet-available areas
	(dashed box, the prototype's `.locked`).

	<EmptyState title={m.tasks_empty_title()} description={m.tasks_empty_hint()}>
		{#snippet action()}<Button size="sm" variant="ghost" href="?">{m.filter_reset()}</Button>{/snippet}
	</EmptyState>
-->
<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import { cn } from '../utils.ts';

	type Props = {
		title: string;
		description?: string;
		/** A Lucide icon component, e.g. `icon={Inbox}`. */
		icon?: Component<{ class?: string; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' }>;
		action?: Snippet;
		class?: string;
	};

	let { title, description, icon: Icon, action, class: className }: Props = $props();
</script>

<div
	class={cn(
		'flex flex-col items-start gap-2.5 border border-dashed border-ink bg-sunken p-5',
		className
	)}
>
	{#if Icon}<Icon class="size-6" strokeWidth={1.9} aria-hidden="true" />{/if}
	<p class="text-h3">{title}</p>
	{#if description}<p class="text-small text-muted">{description}</p>{/if}
	{#if action}<div class="mt-1">{@render action()}</div>{/if}
</div>
