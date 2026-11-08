<!--
	Admin task list. Filters live in the URL (?view, ?q, ?category), so they
	work without JS, survive reloads and can be shared. The queries re-run
	whenever the URL changes, because their arguments are derived from it.
-->
<script lang="ts">
	import { ListChecks, Plus } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { Button, Card, Chip, EmptyState, FormField, Input, Select } from '#lib/ui';
	import { adminTasks, manageableCategories } from './tasks.remote';
	import TaskRow from './TaskRow.svelte';

	const params = $derived(page.url.searchParams);
	const view = $derived(params.get('view') === 'deleted' ? 'deleted' : 'active');
	const q = $derived(params.get('q') ?? '');

	// Unknown or foreign ids are dropped on the server (see adminTasks).
	const categoryId = $derived(params.get('category') ?? undefined);

	// One `await` for both queries: they load in parallel, during SSR and
	// again on the client whenever the URL (and so an argument) changes.
	const [categories, tasks] = $derived(
		await Promise.all([
			manageableCategories(),
			adminTasks({ q, categoryId, deleted: view === 'deleted' })
		])
	);

	const filtered = $derived(Boolean(q || categoryId));
	// the select shows only categories we actually have
	const selectedCategory = $derived(
		categories.some((g) => g.categories.some((c) => c.id === categoryId)) ? categoryId : ''
	);
	const hasCategories = $derived(categories.length > 0);

	const viewHref = (v: 'active' | 'deleted') => {
		const next = new URLSearchParams(page.url.search);
		if (v === 'active') next.delete('view');
		else next.set('view', v);
		const s = next.toString();
		return s ? `?${s}` : resolve('/admin/tasks');
	};

	/** Same view, no search or category. */
	const resetHref = $derived(view === 'deleted' ? '?view=deleted' : resolve('/admin/tasks'));

	const categoryGroups = $derived(
		categories.map((g) => ({
			label: g.name,
			options: g.categories.map((c) => ({ value: c.id, label: c.name }))
		}))
	);
</script>

<div class="flex flex-wrap items-end justify-between gap-4">
	<h1>{m.admin_tasks_title()}</h1>
	{#if hasCategories}
		<Button href={resolve('/admin/tasks/new')}>
			<Plus class="size-4.5" strokeWidth={2} aria-hidden="true" />
			{m.admin_tasks_new()}
		</Button>
	{/if}
</div>

{#if !hasCategories}
	<EmptyState
		class="mt-6"
		icon={ListChecks}
		title={m.admin_no_capabilities_title()}
		description={m.admin_no_capabilities_hint()}
	/>
{:else}
	<nav class="mt-6 flex gap-2" aria-label={m.admin_tasks_views()}>
		<Chip href={viewHref('active')} pressed={view === 'active'}>{m.admin_tasks_view_active()}</Chip>
		<Chip href={viewHref('deleted')} pressed={view === 'deleted'}>
			{m.admin_tasks_view_deleted()}
		</Chip>
	</nav>

	<!-- GET form: submitting just changes the URL. reset=false keeps the cursor and input as they are. -->
	<form method="get" data-sveltekit-reset="false" class="mt-4 flex flex-wrap items-end gap-3">
		{#if view === 'deleted'}<input type="hidden" name="view" value="deleted" />{/if}
		<FormField label={m.admin_tasks_search()} class="min-w-48 flex-1">
			<Input type="search" name="q" value={q} placeholder={m.admin_tasks_search_placeholder()} />
		</FormField>
		<FormField label={m.task_category()} class="min-w-48">
			<Select
				name="category"
				value={selectedCategory}
				groups={categoryGroups}
				placeholder={m.admin_tasks_all_categories()}
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
			/>
		</FormField>
		<Button type="submit" variant="ghost">{m.admin_tasks_filter()}</Button>
	</form>

	{#if tasks.length === 0}
		<EmptyState
			class="mt-6"
			title={view === 'deleted' ? m.admin_tasks_deleted_empty() : m.admin_tasks_empty_title()}
			description={view === 'deleted' ? undefined : m.admin_tasks_empty_hint()}
		>
			{#snippet action()}
				{#if filtered}
					<Button size="sm" variant="ghost" href={resetHref}>
						{m.admin_tasks_filter_reset()}
					</Button>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		<Card class="mt-6" padded={false}>
			<ul class="divide-y divide-hair">
				{#each tasks as task (task.id)}
					<TaskRow {task} {view} />
				{/each}
			</ul>
		</Card>
	{/if}
{/if}
