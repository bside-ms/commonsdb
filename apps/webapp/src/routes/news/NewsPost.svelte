<!--
	One news post as members see it: title, date, body. Used on the start
	page and in the archive.
-->
<script lang="ts">
	import { Pin } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate } from '#lib/format.ts';
	import { RichText } from '#lib/ui';
	import type { NewsView } from './news.remote';

	type Props = { post: NewsView; headingLevel?: 'h2' | 'h3' };

	let { post, headingLevel = 'h3' }: Props = $props();
</script>

<article class="border border-ink bg-paper p-4 sm:p-5">
	<p class="flex items-center gap-1.5 text-small text-muted">
		{#if post.pinned}
			<Pin class="size-3.5" strokeWidth={2} aria-hidden="true" />
			<span class="sr-only">{m.news_pinned()}:</span>
		{/if}
		<time datetime={post.publishedAt?.toISOString()}>{formatDate(post.publishedAt!)}</time>
	</p>
	<svelte:element this={headingLevel} class="mt-1 text-h3">{post.title}</svelte:element>
	<RichText html={post.html} class="mt-2" />
</article>
