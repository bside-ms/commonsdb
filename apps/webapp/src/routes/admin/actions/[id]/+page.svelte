<!--
	Edit an Aktion and mark its tasks: the form, then the marked tasks
	(unmark per row), then a search over the admin's tasks to mark more.
	Deleting keeps the tasks; it sits in a <details> at the end.
-->
<script lang="ts">
	import { Eye } from '@lucide/svelte';
	import type { TaskListItem } from '@commonsdb/core';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { formatWhen } from '#lib/format.ts';
	import { Badge, Button, Input } from '#lib/ui';
	import { adminAction, leadChoices, markableTasks, removeAction } from '../actions.remote';
	import ActionForm from '../ActionForm.svelte';
	import MarkTaskButton from '../MarkTaskButton.svelte';

	const id = $derived(page.params.id!);
	const q = $derived(page.url.searchParams.get('q') ?? '');

	const [item, people, candidates] = $derived(
		await Promise.all([adminAction(id), leadChoices(), markableTasks({ actionId: id, q })])
	);

	const del = $derived(removeAction.for(id));
	const delIssues = $derived(del.fields.id.issues() ?? []);

	type Row = Pick<TaskListItem, 'id' | 'title' | 'whenKind' | 'startsOn' | 'endsOn' | 'category'>;
</script>

{#snippet row(task: Row, actionId: string | null, label: string, other = false)}
	<li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
		<span class="min-w-0">
			<a href={resolve('/admin/tasks/[id]', { id: task.id })} class="font-semibold">{task.title}</a>
			{#if other}<Badge outline class="ml-1.5">{m.admin_actions_in_other()}</Badge>{/if}
			<span class="block text-small text-muted">
				{formatWhen(task)} · {task.category.name}
			</span>
		</span>
		<MarkTaskButton taskId={task.id} {actionId} {label} />
	</li>
{/snippet}

<svelte:head><title>{item.title} · {m.app_name()}</title></svelte:head>

<p class="text-caps text-muted uppercase">{m.admin_actions_edit()}</p>
<div class="mt-1 flex flex-wrap items-end justify-between gap-3">
	<h1>{item.title}</h1>
	<Button size="sm" variant="ghost" href={resolve('/aktion/[id]', { id })}>
		<Eye class="size-4" strokeWidth={2} aria-hidden="true" />
		{m.admin_actions_member_view()}
	</Button>
</div>

<div class="mt-6 max-w-3xl border border-ink bg-paper p-4 sm:p-6">
	<ActionForm {item} {people} cancelHref={resolve('/admin/actions')} />
</div>

<section class="mt-10 max-w-3xl" aria-labelledby="marked-heading">
	<h2 id="marked-heading">
		{m.admin_actions_tasks()} ({item.tasks.length})
	</h2>
	{#if item.tasks.length === 0}
		<p class="mt-3 text-small text-muted">{m.admin_actions_tasks_empty()}</p>
	{:else}
		<ul class="mt-3 divide-y divide-ink border border-ink bg-paper">
			{#each item.tasks as task (task.id)}
				{@render row(task, null, m.admin_actions_unmark())}
			{/each}
		</ul>
	{/if}
</section>

<section class="mt-10 max-w-3xl" aria-labelledby="add-heading">
	<h2 id="add-heading">{m.admin_actions_add_title()}</h2>
	<p class="mt-2 text-small text-muted">{m.admin_actions_add_hint()}</p>

	<form method="get" data-sveltekit-reset="false" class="mt-3 flex gap-2" role="search">
		<Input
			type="search"
			name="q"
			value={q}
			placeholder={m.admin_tasks_search_placeholder()}
			aria-label={m.admin_tasks_search()}
			class="flex-1"
		/>
		<Button type="submit" variant="ghost">{m.admin_tasks_search()}</Button>
	</form>

	{#if candidates.length === 0}
		<p class="mt-3 text-small text-muted">{m.admin_actions_add_none()}</p>
	{:else}
		<ul class="mt-3 divide-y divide-ink border border-ink bg-paper">
			{#each candidates as task (task.id)}
				{@render row(task, id, m.admin_actions_mark(), task.actionId !== null)}
			{/each}
		</ul>
	{/if}
</section>

<details class="mt-10 max-w-3xl border border-ink bg-paper">
	<summary class="cursor-pointer px-4 py-3 font-semibold">{m.admin_actions_delete()}</summary>
	<form {...del} class="grid gap-3 border-t border-ink p-4">
		<input {...del.fields.id.as('hidden', id)} />
		<p class="text-small">{m.admin_actions_delete_hint()}</p>
		{#each delIssues as issue (issue.message)}
			<p role="alert" class="text-small font-semibold text-danger">{errorMessage(issue.message)}</p>
		{/each}
		<div><Button type="submit" variant="ghost">{m.admin_actions_delete_confirm()}</Button></div>
	</form>
</details>
