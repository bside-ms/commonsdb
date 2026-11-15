<!--
	@component
	The "Saldo": one big number with a label. The caller formats the value
	(sign, locale, unit), so this stays free of domain logic and i18n.

	<Balance value="12,5" label="Repros" href="/account" />
-->
<script lang="ts">
	import { cn } from '#lib/ui';

	type Props = {
		value: string;
		label: string;
		/** Makes the whole tile a link (one tab stop). */
		href?: string;
		class?: string;
	};

	let { value, label, href, class: className }: Props = $props();
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	class={cn(
		'flex flex-col gap-1 border border-ink bg-area-commons p-4 text-ink no-underline',
		href && 'hover:bg-hover',
		className
	)}
>
	<span class="text-saldo">{value}</span>
	<span class="text-caps">{label}</span>
</svelte:element>