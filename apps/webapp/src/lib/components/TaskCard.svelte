<!--
	A task in the member list. The whole card is the link (one tab stop,
	big touch target); badges and facts sit inside it.
-->
<script lang="ts">
	import type { TaskListItem } from '@commonsdb/core';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatHours, formatHoursRange, formatWhen } from '#lib/format.ts';
	import { Badge } from '#lib/ui';

	let { task }: { task: TaskListItem } = $props();

	const shifts = $derived(task.shifts);
	// your own shift's hours once you have one; otherwise what's on offer
	const hours = $derived(
		shifts.mine ? formatHours(shifts.mine.hoursTenths) : formatHoursRange(shifts.hoursTenths)
	);
	const meta = $derived([formatWhen(task), hours, task.place].filter(Boolean).join(' · '));
</script>

<a
	href={resolve('/tasks/[id]', { id: task.id })}
	class="flex h-full flex-col gap-2 border border-ink bg-paper p-4 no-underline hover:bg-hover"
>
	<!-- title first: it's what a screen reader announces as the link's name -->
	<span class="text-h3">{task.title}</span>
	<span class="flex flex-wrap gap-1.5">
		{#if shifts.mine?.status === 'reported'}
			<Badge tone="info">{m.task_status_reported()}</Badge>
		{:else if shifts.mine}
			<Badge tone="neutral">{m.task_mine()}</Badge>
		{:else if shifts.total > 1}
			<Badge outline>{m.task_shifts_free({ free: shifts.free, total: shifts.total })}</Badge>
		{/if}
		{#if task.urgent}<Badge tone="attention">{m.task_urgent()}</Badge>{/if}
		{#if shifts.together}<Badge tone="success">{m.task_together()}</Badge>{/if}
		<Badge outline>{task.category.name}</Badge>
	</span>
	<span class="mt-auto text-small text-muted">{meta}</span>
</a>
