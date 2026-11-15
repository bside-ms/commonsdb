<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { Badge, Button, Card, toast } from '#lib/ui';
	import { adminTask, duplicate, manageableCategories, remove, restore } from '../tasks.remote';
	import TaskForm from '../TaskForm.svelte';
	import AssignedShift from './AssignedShift.svelte';

	// page.params.id is typed from the folder name [id]. Both queries in one
	// await, so they load in parallel.
	const [task, categories] = $derived(
		await Promise.all([adminTask(page.params.id!), manageableCategories()])
	);

	const dup = $derived(duplicate.for(task.id));
	const del = $derived(remove.for(task.id));
	const res = $derived(restore.for(task.id));
	const held = $derived(task.shifts.filter((s) => s.status !== 'open'));
</script>

<svelte:head><title>{task.title} · {m.app_name()}</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<p class="text-caps text-muted uppercase">{m.admin_task_edit_title()}</p>
		<h1 class="mt-1">{task.title}</h1>
	</div>
	<div class="flex flex-wrap gap-2">
		<form {...dup}>
			<input {...dup.fields.id.as('hidden', task.id)} />
			<Button type="submit" size="sm" variant="ghost">{m.admin_task_duplicate()}</Button>
		</form>
		{#if task.deleted}
			<form
				{...res.enhance(async ({ submit }) => {
					if (await submit()) toast(m.admin_task_restored_toast());
				})}
			>
				<input {...res.fields.id.as('hidden', task.id)} />
				<Button type="submit" size="sm" variant="ghost">{m.admin_task_restore()}</Button>
			</form>
		{:else}
			<form
				{...del.enhance(async ({ submit }) => {
					if (await submit()) toast(m.admin_task_deleted_toast());
				})}
			>
				<input {...del.fields.id.as('hidden', task.id)} />
				<Button type="submit" size="sm" variant="ghost" tone="danger"
					>{m.admin_task_delete()}</Button
				>
			</form>
		{/if}
	</div>
</div>

<div class="mt-6 grid max-w-3xl gap-6">
	{#if task.deleted}
		<div>
			<Badge>{m.task_deleted()}</Badge>
		</div>
	{/if}

	{#if held.length > 0}
		<Card title={m.admin_task_shifts_title()}>
			<p class="text-small text-muted">{m.admin_task_release_hint()}</p>
			<ul class="mt-2 divide-y divide-hair">
				{#each held as shift (shift.id)}
					<AssignedShift {shift} />
				{/each}
			</ul>
		</Card>
	{/if}

	<div class="border border-ink bg-paper p-4 sm:p-6">
		<!-- {#key}: a different task (e.g. after "Duplizieren") gets a fresh form and editor -->
		{#key task.id}
			<TaskForm {task} {categories} cancelHref={resolve('/admin/tasks')} />
		{/key}
	</div>
</div>
