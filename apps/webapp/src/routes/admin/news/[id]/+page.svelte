<!--
	Edit a news post. Deleting is for good, so it sits in a <details> at
	the end; unticking "Veröffentlichen" is the gentle way to hide a post.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { Button } from '#lib/ui';
	import { adminNewsItem, removeNews } from '../news.remote';
	import NewsForm from '../NewsForm.svelte';

	const item = $derived(await adminNewsItem(page.params.id!));
	const del = $derived(removeNews.for(item.id));
	const delIssues = $derived(del.fields.id.issues() ?? []);
</script>

<svelte:head><title>{item.title} · {m.app_name()}</title></svelte:head>

<p class="text-caps text-muted uppercase">{m.admin_news_edit()}</p>
<h1 class="mt-1">{item.title}</h1>

<div class="mt-6 max-w-3xl border border-ink bg-paper p-4 sm:p-6">
	<NewsForm {item} cancelHref={resolve('/admin/news')} />
</div>

<details class="mt-8 max-w-3xl border border-ink bg-paper">
	<summary class="cursor-pointer px-4 py-3 font-semibold">{m.admin_news_delete()}</summary>
	<form {...del} class="grid gap-3 border-t border-ink p-4">
		<input {...del.fields.id.as('hidden', item.id)} />
		<p class="text-small">{m.admin_news_delete_hint()}</p>
		{#each delIssues as issue (issue.message)}
			<p role="alert" class="text-small font-semibold text-danger">
				{errorMessage(issue.message)}
			</p>
		{/each}
		<div><Button type="submit" variant="ghost">{m.admin_news_delete_confirm()}</Button></div>
	</form>
</details>
