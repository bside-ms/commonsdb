<!--
	@component
	Small uppercase status label. Text is passed in, translated.

	<Badge tone="attention">{m.task_urgent()}</Badge>
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { badge, type BadgeVariants } from './variants.ts';

	type Props = BadgeVariants &
		Omit<HTMLAttributes<HTMLSpanElement>, 'class'> & { class?: string; children: Snippet };

	let { tone, outline, class: className, children, ...rest }: Props = $props();
</script>

<span {...rest} class={badge({ tone, outline, class: className })}>{@render children()}</span>
