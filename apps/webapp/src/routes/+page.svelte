<script lang="ts">
	import { Box, GraduationCap, Inbox, SquareCheck, Users } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import TaskCard from '#lib/components/TaskCard.svelte';
	import type { PageProps } from './$types';
	import { formatRepros } from '#lib/format.ts';
	import { Badge, Balance, Button, EmptyState } from '#lib/ui';
	import { myTasks } from './tasks/tasks.remote';
	import { ownBalance } from './account/account.remote';
	import { unreadCount } from './messages/messages.remote';
	import { currentNews } from './news/news.remote';
	import NewsPost from './news/NewsPost.svelte';

	let { data }: PageProps = $props();

	const [mine, balance, unread, news] = $derived(
		await Promise.all([myTasks(), ownBalance(), unreadCount(), currentNews()])
	);

	const soon = [
		{ href: resolve('/commons'), label: m.nav_commons(), icon: Box },
		{ href: resolve('/initiatives'), label: m.nav_initiatives(), icon: Users },
		{ href: resolve('/qualifications'), label: m.nav_qualifications(), icon: GraduationCap }
	];
</script>

{#snippet sectionHead(id: string, title: string, href?: string, link?: string)}
	<div class="mt-8 flex flex-wrap items-end justify-between gap-3 first:mt-0">
		<h2 {id}>{title}</h2>
		{#if href && link}
			<a {href} class="text-small font-semibold underline-offset-3">{link}</a>
		{/if}
	</div>
{/snippet}

<div class="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,32rem)]">
	<div class="space-y-6">
		<div>
			<p class="text-small text-muted">{m.home_tagline()}</p>
			<h1 class="mt-1.5">{m.home_greeting({ name: data.user?.displayName ?? '' })}</h1>
		</div>

		<section aria-labelledby="mine-heading">
			{@render sectionHead('mine-heading', m.tasks_mine(), resolve('/tasks'), m.home_find_tasks())}
			{#if mine.length === 0}
				<EmptyState
					class="mt-3"
					icon={SquareCheck}
					title={m.home_no_tasks_title()}
					description={m.home_no_tasks_hint()}
				/>
			{:else}
				<ul class="mt-3 grid gap-3 sm:grid-cols-2">
					{#each mine as task (task.id)}
						<li>
							<TaskCard {task} />
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section aria-labelledby="inbox-heading">
			{@render sectionHead(
				'inbox-heading',
				m.home_inbox(),
				resolve('/messages'),
				m.home_inbox_all()
			)}
			<a
				href={resolve('/messages')}
				class="mt-3 flex items-center justify-between gap-3 border border-ink bg-paper p-4 no-underline hover:bg-hover"
			>
				<span class="flex items-center gap-2.5 font-semibold">
					<Inbox class="size-5" strokeWidth={1.9} aria-hidden="true" />
					{m.home_inbox_tile()}
				</span>
				{#if unread > 0}
					<Badge>{m.home_inbox_new({ count: unread })}</Badge>
				{/if}
			</a>
		</section>

		{#if news.length > 0}
			<section aria-labelledby="news-heading">
				{@render sectionHead('news-heading', m.news_title(), resolve('/news'), m.news_all())}
				<ul class="mt-3 grid gap-3">
					{#each news as post (post.id)}
						<li>
							<NewsPost {post} />
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>

	<div class="space-y-6">
		<section aria-labelledby="account-heading">
			{@render sectionHead(
				'account-heading',
				m.home_account_title(),
				resolve('/account'),
				m.home_account_history()
			)}
			<Balance
				class="mt-3"
				href={resolve('/account')}
				value={formatRepros(balance)}
				label={m.home_account_label()}
			/>
			<p class="mt-3 text-small">{m.home_account_text()}</p>
			<Button class="mt-3 w-full" variant="ghost" href={resolve('/account')}>
				{m.home_account_open()}
			</Button>
		</section>

		<section aria-labelledby="profile-heading">
			{@render sectionHead('profile-heading', m.home_profile_title())}
			<div class="mt-3 grid gap-2">
				<Button variant="ghost" href={resolve('/profile/edit')}>{m.profile_edit_title()}</Button>
				<form method="post" action="/logout" class="grid">
					<Button type="submit" variant="ghost">{m.logout()}</Button>
				</form>
			</div>
		</section>

		<section aria-labelledby="join-heading">
			{@render sectionHead('join-heading', m.home_join_title())}
			<div class="mt-3 grid gap-2">
				<Button variant="ghost" href={resolve('/suggestions')}>{m.home_suggest_task()}</Button>
				<Button variant="ghost" href={resolve('/about')}>{m.about_link()}</Button>
			</div>
		</section>

		<section aria-labelledby="soon-heading">
			{@render sectionHead('soon-heading', m.home_soon_title())}
			<ul class="mt-3 grid gap-2">
				{#each soon as area (area.href)}
					<li>
						<a
							href={area.href}
							class="flex items-center gap-2.5 border border-dashed border-ink bg-sunken p-3.5 font-semibold no-underline hover:bg-hover"
						>
							<area.icon class="size-5" strokeWidth={1.9} aria-hidden="true" />
							{area.label}
						</a>
					</li>
				{/each}
			</ul>
		</section>
		<p class="mt-8 border-t border-hair pt-4 text-small text-muted">{m.home_stage_note()}</p>
	</div>
</div>
