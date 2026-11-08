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

	let { task, view }: { task: AdminTaskListItem; view: 'active' | 'deleted' } = $props();

	// One form instance per row and action; `.for(id)` keeps their states apart.
	const dup = $derived(duplicate.for(task.id));
	const del = $derived(remove.for(task.id));
	const res = $derived(restore.for(task.id));
</script>

<li class="flex flex-wrap items-center gap-x-5 gap-y-2.5 px-4 py-3.5">
	<div class="min-w-0 flex-1 basis-64">
		<h2 class="text-h3">
			<a href={resolve('/admin/tasks/[id]', { id: task.id })} class="no-underline hover:underline">
				{task.title}
			</a>
		</h2>
		<p class="mt-0.5 text-small text-muted">
			{task.category.name} · {formatWhen(task)} · {formatHours(task.shift.hoursTenths)}
		</p>
	</div>

	<div class="flex flex-wrap gap-1.5">
		{#if task.urgent}<Badge tone="attention">{m.task_urgent()}</Badge>{/if}
		{#if task.shift.status === 'open'}
			<Badge outline>{m.task_status_open()}</Badge>
		{:else}
			<Badge tone="info">
				{task.shift.assigneeName
					? m.task_taken_by({ name: task.shift.assigneeName })
					: m.task_status_taken()}
			</Badge>
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
