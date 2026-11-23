<script lang="ts">
	import { Lightbulb, ListChecks } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import TaskCard from '#lib/components/TaskCard.svelte';
	import type { PageProps } from './$types';
	import { formatRepros } from '#lib/format.ts';
	import { Balance, Button, EmptyState } from '#lib/ui';
	import { myTasks } from './tasks/tasks.remote';
	import { ownBalance } from './account/account.remote';
	import { currentNews } from './news/news.remote';
	import NewsPost from './news/NewsPost.svelte';

	let { data }: PageProps = $props();

	const [mine, balance, news] = $derived(
		await Promise.all([myTasks(), ownBalance(), currentNews()])
	);
</script>

<h1>{m.home_greeting({ name: data.user?.displayName ?? '' })}</h1>

<Balance
	class="mt-6 max-w-xs"
	href={resolve('/account')}
	value={formatRepros(balance)}
	label={m.account_balance_label()}
/>

<Button class="mt-4" size="sm" variant="ghost" href={resolve('/suggestions')}>
	<Lightbulb class="size-4" strokeWidth={2} aria-hidden="true" />
	{m.home_suggest()}
</Button>

{#if news.length > 0}
	<section class="mt-8" aria-labelledby="news-heading">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<h2 id="news-heading">{m.news_title()}</h2>
			<Button size="sm" variant="ghost" href={resolve('/news')}>{m.news_all()}</Button>
		</div>
		<ul class="mt-3 grid gap-3 lg:grid-cols-2">
			{#each news as post (post.id)}
				<li><NewsPost {post} /></li>
			{/each}
		</ul>
	</section>
{/if}

<section class="mt-8" aria-labelledby="mine-heading">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<h2 id="mine-heading">{m.tasks_mine()}</h2>
		{#if mine.length > 0}
			<Button size="sm" variant="ghost" href={resolve('/tasks')}>{m.tasks_back()}</Button>
		{/if}
	</div>

	{#if mine.length === 0}
		<EmptyState
			class="mt-3"
			icon={ListChecks}
			title={m.home_no_tasks_title()}
			description={m.home_no_tasks_hint()}
		>
			{#snippet action()}
				<Button size="sm" href={resolve('/tasks')}>{m.home_browse_tasks()}</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<ul class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{#each mine as task (task.id)}
				<li>
					<TaskCard {task} />
				</li>
			{/each}
		</ul>
	{/if}
</section>

<p class="mt-12 text-small">
	<a href={resolve('/about')} class="font-semibold">{m.about_link()}</a>
</p>
