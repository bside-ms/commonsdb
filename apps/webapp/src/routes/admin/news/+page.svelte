<!--
	News for admins: drafts first, then everything published, newest first.
	Expired posts are marked; they're off the start page but in the archive.
-->
<script lang="ts">
	import { Newspaper, Plus } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate } from '#lib/format.ts';
	import { Badge, Button, EmptyState } from '#lib/ui';
	import { adminNews } from './news.remote';

	const items = $derived(await adminNews());
	const today = new Date().toLocaleDateString('sv'); // YYYY-MM-DD
</script>

<svelte:head><title>{m.admin_news_title()} · {m.app_name()}</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<h1>{m.admin_news_title()}</h1>
	<Button href={resolve('/admin/news/new')}>
		<Plus class="size-4.5" strokeWidth={2} aria-hidden="true" />
		{m.admin_news_new()}
	</Button>
</div>

{#if items.length === 0}
	<EmptyState
		class="mt-6"
		icon={Newspaper}
		title={m.admin_news_empty_title()}
		description={m.admin_news_empty_hint()}
	/>
{:else}
	<ul class="mt-6 divide-y divide-ink border border-ink bg-paper">
		{#each items as item (item.id)}
			<li class="px-4 py-4">
				<div class="flex flex-wrap gap-1.5">
					{#if !item.publishedAt}
						<Badge>{m.admin_news_draft()}</Badge>
					{:else if item.visibleUntil && item.visibleUntil < today}
						<Badge outline>{m.admin_news_expired()}</Badge>
					{/if}
					{#if item.pinned}<Badge outline>{m.news_pinned()}</Badge>{/if}
				</div>
				<h2 class="mt-1.5 text-h3">
					<a
						href={resolve('/admin/news/[id]', { id: item.id })}
						class="no-underline hover:underline"
					>
						{item.title}
					</a>
				</h2>
				<p class="mt-0.5 text-small text-muted">
					{item.publishedAt
						? m.admin_news_published_on({ date: formatDate(item.publishedAt) })
						: m.admin_news_draft_since({ date: formatDate(item.updatedAt) })}
					{#if item.author}· {item.author}{/if}
					{#if item.visibleUntil}
						· {m.admin_news_until({ date: formatDate(new Date(item.visibleUntil)) })}
					{/if}
				</p>
			</li>
		{/each}
	</ul>
{/if}
