<script lang="ts">
	import { ListChecks } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { Button, EmptyState } from '#lib/ui';
	import TaskCard from '#lib/components/TaskCard.svelte';
	import { myTasks } from './tasks/tasks.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const mine = $derived(await myTasks());
</script>

<h1>{m.home_greeting({ name: data.user?.displayName ?? '' })}</h1>

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
