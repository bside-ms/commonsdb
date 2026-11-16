<!--
	One row of the admin task list. Its own component so each row owns its
	form instances: when a row disappears (deleted, restored), its forms go
	with it instead of being read from a destroyed {#each} block.
-->
<script lang="ts">
	import type { AdminTaskListItem } from '@commonsdb/core';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatHours, formatWhen } from '#lib/format.ts';
	import { Badge, Button, toast } from '#lib/ui';
	import { duplicate, remove, restore } from './tasks.remote';
	import ShiftStatusBadge from './ShiftStatusBadge.svelte';

	let { task, view }: { task: AdminTaskListItem; view: 'active' | 'deleted' } = $props();

	// One form instance per row and action; `.for(id)` keeps their states apart.
	const dup = $derived(duplicate.for(task.id));
	const del = $derived(remove.for(task.id));
	const res = $derived(restore.for(task.id));
	const total = $derived(task.shifts.length);
	const free = $derived(task.shifts.filter((s) => s.status === 'open').length);
	const reported = $derived(task.shifts.filter((s) => s.status === 'reported').length);
</script>

<li class="flex flex-wrap items-center gap-x-5 gap-y-2.5 px-4 py-3.5">
	<div class="min-w-0 flex-1 basis-64">
		<h2 class="text-h3">
			<a href={resolve('/admin/tasks/[id]', { id: task.id })} class="no-underline hover:underline">
				{task.title}
			</a>
		</h2>
		<p class="mt-0.5 text-small text-muted">
			{task.category.name} · {formatWhen(task)} ·
			{total === 1
				? formatHours(task.shifts[0].hoursTenths)
				: m.task_shifts_count({ count: total })}
		</p>
	</div>

	<div class="flex flex-wrap gap-1.5">
		{#if task.urgent}
			<Badge tone="attention">{m.task_urgent()}</Badge>
		{/if}
		{#if task.seriesId}
			<Badge outline>{m.task_series_badge()}</Badge>
		{/if}
		{#if total === 1}
			<ShiftStatusBadge shift={task.shifts[0]} />
		{:else}
			{#if free > 0}
				<Badge outline>{m.task_shifts_free({ free, total })}</Badge>
			{:else}
				<Badge>{m.task_shifts_full()}</Badge>
			{/if}
			{#if reported > 0}
				<Badge tone="info">{m.task_shifts_reported({ count: reported })}</Badge>
			{/if}
		{/if}
	</div>

	<div class="flex gap-2">
		{#if view === 'active'}
			<form {...dup}>
				<input {...dup.fields.id.as('hidden', task.id)} />
				<Button type="submit" size="sm" variant="ghost" disabled={dup.pending > 0}>
					{m.admin_task_duplicate()}
				</Button>
			</form>
			<form
				{...del.enhance(async ({ submit }) => {
					if (await submit()) toast(m.admin_task_deleted_toast());
				})}
			>
				<input {...del.fields.id.as('hidden', task.id)} />
				<Button type="submit" size="sm" variant="ghost" tone="danger" disabled={del.pending > 0}>
					{m.admin_task_delete()}
				</Button>
			</form>
		{:else}
			<form
				{...res.enhance(async ({ submit }) => {
					if (await submit()) toast(m.admin_task_restored_toast());
				})}
			>
				<input {...res.fields.id.as('hidden', task.id)} />
				<Button type="submit" size="sm" variant="ghost" disabled={res.pending > 0}>
					{m.admin_task_restore()}
				</Button>
			</form>
		{/if}
	</div>
</li>
