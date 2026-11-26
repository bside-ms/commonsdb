<!--
	Member task list. Filters are links (?super=...&category=..., toggles
	?urgent=1&now=1&together=1) and a GET search form, so everything works
	without JS and can be bookmarked.
	"Meine Aufgaben" first, then what's open.
-->
<script lang="ts">
	import { SquareCheck } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { Button, Chip, EmptyState, Input } from '#lib/ui';
	import { memberTasks, taskCategories } from './tasks.remote';
	import TaskCard from '#lib/components/TaskCard.svelte';

	const params = $derived(page.url.searchParams);
	const q = $derived(params.get('q') ?? '');
	const superId = $derived(params.get('super') ?? undefined);
	const categoryId = $derived(params.get('category') ?? undefined);
	const urgent = $derived(params.has('urgent'));
	const now = $derived(params.has('now'));
	const together = $derived(params.has('together'));

	const [groups, tasks] = $derived(
		await Promise.all([
			taskCategories(),
			memberTasks({ q, superCategoryId: superId, categoryId, urgent, now, together })
		])
	);

	const mine = $derived(tasks.filter((t) => t.shifts.mine));
	const open = $derived(tasks.filter((t) => !t.shifts.mine));
	const selectedGroup = $derived(groups.find((g) => g.id === superId));
	const filtered = $derived(Boolean(q || superId || categoryId || urgent || now || together));

	/** The on/off filters: label, URL key, current state. */
	const toggles = $derived([
		[m.tasks_filter_urgent(), 'urgent', urgent],
		[m.tasks_filter_now(), 'now', now],
		[m.tasks_filter_together(), 'together', together]
	] as const);

	/** Link to this page with some params changed (undefined removes one). */
	function withParams(changes: Record<string, string | undefined>) {
		const next = new URLSearchParams(page.url.search);
		for (const [key, value] of Object.entries(changes)) {
			if (value) next.set(key, value);
			else next.delete(key);
		}
		const s = next.toString();
		return s ? `?${s}` : resolve('/tasks');
	}
</script>

<svelte:head><title>{m.tasks_title()} · {m.app_name()}</title></svelte:head>

<h1>{m.tasks_title()}</h1>

<form method="get" data-sveltekit-reset="false" class="mt-5 flex gap-2" role="search">
	{#if superId}<input type="hidden" name="super" value={superId} />{/if}
	{#if categoryId}<input type="hidden" name="category" value={categoryId} />{/if}
	{#each toggles as [, key, on] (key)}
		{#if on}<input type="hidden" name={key} value="1" />{/if}
	{/each}
	<Input
		type="search"
		name="q"
		value={q}
		placeholder={m.tasks_search_placeholder()}
		aria-label={m.tasks_search()}
		class="max-w-md"
	/>
	<Button type="submit" variant="ghost">{m.tasks_search()}</Button>
</form>

<nav class="mt-4 grid gap-2.5" aria-label={m.tasks_filter_categories()}>
	<div class="flex flex-wrap gap-2">
		<Chip href={withParams({ super: undefined, category: undefined })} pressed={!superId}>
			{m.tasks_filter_all()}
		</Chip>
		{#each groups as g (g.id)}
			<Chip href={withParams({ super: g.id, category: undefined })} pressed={superId === g.id}>
				{g.name}
			</Chip>
		{/each}
	</div>
	{#if selectedGroup && selectedGroup.categories.length > 1}
		<div class="flex flex-wrap gap-1.5">
			<Chip size="sub" href={withParams({ category: undefined })} pressed={!categoryId}>
				{m.tasks_filter_all_in({ name: selectedGroup.name })}
			</Chip>
			{#each selectedGroup.categories as c (c.id)}
				<Chip size="sub" href={withParams({ category: c.id })} pressed={categoryId === c.id}>
					{c.name}
				</Chip>
			{/each}
		</div>
	{/if}
</nav>

<nav class="mt-3 flex flex-wrap gap-1.5" aria-label={m.tasks_filter_more()}>
	{#each toggles as [label, key, on] (key)}
		<Chip size="sub" href={withParams({ [key]: on ? undefined : '1' })} pressed={on}>{label}</Chip>
	{/each}
</nav>

{#if mine.length > 0}
	<section class="mt-8" aria-labelledby="mine-heading">
		<h2 id="mine-heading">{m.tasks_mine()}</h2>
		<ul class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{#each mine as task (task.id)}
				<li>
					<TaskCard {task} />
				</li>
			{/each}
		</ul>
	</section>
{/if}

<section class="mt-8" aria-labelledby="open-heading">
	<h2 id="open-heading">{m.tasks_open()}</h2>
	{#if open.length === 0}
		<EmptyState
			class="mt-3"
			icon={SquareCheck}
			title={m.tasks_empty_title()}
			description={m.tasks_empty_hint()}
		>
			{#snippet action()}
				{#if filtered}
					<Button size="sm" variant="ghost" href={resolve('/tasks')}
						>{m.tasks_filter_reset()}</Button
					>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		<ul class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{#each open as task (task.id)}
				<li>
					<TaskCard {task} />
				</li>
			{/each}
		</ul>
	{/if}
</section>
