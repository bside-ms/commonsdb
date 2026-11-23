<!--
	News archive: everything published, newest first, including posts that
	have dropped off the start page.
-->
<script lang="ts">
	import { ArrowLeft, Newspaper } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { EmptyState } from '#lib/ui';
	import { newsArchive } from './news.remote';
	import NewsPost from './NewsPost.svelte';

	const posts = $derived(await newsArchive());
</script>

<svelte:head><title>{m.news_title()} · {m.app_name()}</title></svelte:head>

<a href={resolve('/')} class="inline-flex items-center gap-1.5 text-small font-semibold">
	<ArrowLeft class="size-4" strokeWidth={2} aria-hidden="true" />
	{m.nav_start()}
</a>
<h1 class="mt-4">{m.news_title()}</h1>

{#if posts.length === 0}
	<EmptyState class="mt-6" icon={Newspaper} title={m.news_none()} />
{:else}
	<ul class="mt-6 grid max-w-3xl gap-4">
		{#each posts as post (post.id)}
			<li><NewsPost {post} headingLevel="h2" /></li>
		{/each}
	</ul>
{/if}
