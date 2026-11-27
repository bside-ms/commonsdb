<!--
	A task in the member list (prototype `.task-row`): no box, a line
	below each row, the list draws the top line. The whole row is the link.
-->
<script lang="ts">
	import type { TaskListItem } from '@commonsdb/core';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatHours, formatHoursRange, formatWhen, hoursValue } from '#lib/format.ts';
	import { mediaUrl } from '#lib/media.ts';
	import { Badge, Thumb } from '#lib/ui';

	type Person = { name: string | null; guest: boolean };
	let { task, people = [] }: { task: TaskListItem; people?: Person[] } = $props();
	const names = $derived(
		people.map((p) => p.name ?? (p.guest ? m.action_guest() : '—')).join(', ')
	);

	const shifts = $derived(task.shifts);
	const range = $derived(
		shifts.mine
			? { min: shifts.mine.hoursTenths, max: shifts.mine.hoursTenths }
			: shifts.hoursTenths
	);
	// 1 hour = 1 Repro
	const repros = $derived(
		range.min === range.max && range.min === 10
			? m.task_repros_one()
			: m.task_repros({
					value:
						range.min === range.max
							? hoursValue(range.min)
							: `${hoursValue(range.min)}–${hoursValue(range.max)}`
				})
	);
	const hours = $derived(
		shifts.mine ? formatHours(shifts.mine.hoursTenths) : formatHoursRange(shifts.hoursTenths)
	);
	const meta = $derived([task.category.name, hours, task.place].filter(Boolean).join(' · '));
</script>

<a
	href={resolve('/tasks/[id]', { id: task.id })}
	class="flex items-start gap-3 border-b border-hair py-3.5 no-underline hover:bg-hover"
>
	<span class="min-w-0 flex-1">
		<span class="flex items-start justify-between gap-3">
			<span class="flex flex-wrap items-center gap-1.5">
				{#if shifts.mine?.status === 'reported'}
					<Badge tone="info">{m.task_status_reported()}</Badge>
				{:else if shifts.mine}
					<Badge tone="neutral">{m.task_mine()}</Badge>
				{/if}
				{#if task.urgent}<Badge tone="attention">{m.task_urgent()}</Badge>{/if}
				{#if shifts.together}<Badge outline>{m.task_together()}</Badge>{/if}
				{#if task.seriesId}<Badge tone="neutral">⟳ {m.task_series_badge()}</Badge>{/if}
				<span class="text-tiny font-semibold text-muted">{formatWhen(task)}</span>
			</span>
			<span class="text-small font-semibold whitespace-nowrap">{repros}</span>
		</span>
		<span class="mt-0.75 mb-0.5 block text-h3">{task.title}</span>
		<span class="block text-tiny font-medium text-muted">{meta}</span>
		{#if !shifts.mine && shifts.total > 1}
			<span class="mt-1 block text-tiny font-semibold" class:text-muted={shifts.free === 0}>
				{shifts.free === 0
					? m.task_places_full()
					: m.task_places_free({ free: shifts.free, total: shifts.total })}
			</span>
		{/if}
		{#if people.length}
			<span class="mt-1 block text-tiny text-muted">
				{m.action_people({ names })}
			</span>
		{/if}
	</span>
	<Thumb seed={task.seriesId ?? task.id} src={task.image && mediaUrl(task.image.id, 'thumb')} />
</a>
