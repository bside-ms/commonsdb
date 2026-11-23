<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import NewsForm from '../NewsForm.svelte';
</script>

<svelte:head><title>{m.admin_news_new()} · {m.app_name()}</title></svelte:head>

<h1>{m.admin_news_new()}</h1>

<div class="mt-6 max-w-3xl border border-ink bg-paper p-4 sm:p-6">
	<NewsForm cancelHref={resolve('/admin/news')} />
</div>
