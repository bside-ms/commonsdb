<!--
	@component
	Shows a stored rich-text document. Takes HTML rendered on the server
	by toHtml() from @commonsdb/richtext, never anything else: that
	function only emits the profile's nodes, escapes text and checks links,
	which is what makes {@html} safe here. No TipTap in the browser.

	<RichText html={task.descriptionHtml} />
-->
<script lang="ts">
	import { cn } from '../utils.ts';

	type Props = { html: string; class?: string };

	let { html, class: className }: Props = $props();
</script>

{#if html}
	<div class={cn('prose max-w-none', className)}>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- output of toHtml(), see above -->
		{@html html}
	</div>
{/if}
