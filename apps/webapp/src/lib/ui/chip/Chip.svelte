<!--
	@component
	Toggle button for filters (category, time range). State via aria-pressed,
	so screen readers announce "pressed". `sub` is the smaller secondary row.

	<Chip pressed={category === 'bar'} onclick={() => (category = 'bar')}>Bar</Chip>

	For a filter that must work without JS, render chips as links to
	?category=… instead and pass `href`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { tv } from '../utils.ts';

	const chip = tv({
		base: 'inline-flex cursor-pointer items-center gap-1.5 border border-ink whitespace-nowrap no-underline',
		variants: {
			size: {
				md: 'px-3.75 py-2.25 text-small font-semibold',
				sub: 'px-2.75 py-1.5 text-tiny font-medium'
			},
			pressed: { true: '', false: 'bg-paper text-ink hover:bg-hover' }
		},
		compoundVariants: [
			{ size: 'md', pressed: true, class: 'bg-accent text-ink' },
			{ size: 'sub', pressed: true, class: 'bg-ink text-paper' }
		],
		defaultVariants: { size: 'md', pressed: false }
	});

	type Props = Omit<HTMLButtonAttributes, 'class'> & {
		pressed?: boolean;
		size?: 'md' | 'sub';
		href?: HTMLAnchorAttributes['href'];
		class?: string;
		children: Snippet;
	};

	let { pressed = false, size, href, class: className, children, ...rest }: Props = $props();

	const classes = $derived(chip({ size, pressed, class: className }));
</script>

{#if href}
	<a
		{href}
		aria-current={pressed ? 'true' : undefined}
		class={classes}
		{...rest as HTMLAnchorAttributes}>{@render children()}</a
	>
{:else}
	<button type="button" aria-pressed={pressed} class={classes} {...rest}
		>{@render children()}</button
	>
{/if}
