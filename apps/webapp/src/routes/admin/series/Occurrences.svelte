<!--
	Upcoming occurrences of a series: date, how many shifts are free, who
	is on them. Each links to the task, where it can be edited on its own.
	Used by the series list and the series page.
-->
<script lang="ts">
	import type { SeriesOccurrence, SeriesState, SeriesRule } from '@commonsdb/core';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatWhen } from '#lib/format.ts';
	import { Badge } from '#lib/ui';

	let {
		occurrences,
		state,
		rule
	}: { occurrences: SeriesOccurrence[]; state: SeriesState; rule: SeriesRule } = $props();

	const emptyText = $derived(
		state === 'paused'
			? m.admin_series_upcoming_empty_paused()
			: state === 'ended'
				? m.admin_series_upcoming_empty_ended()
				: rule.repeat === 'manual'
					? m.admin_series_upcoming_empty_manual()
					: m.admin_series_upcoming_empty_running()
	);
</script>

{#if occurrences.length === 0}
	<p class="text-small text-muted">{emptyText}</p>
{:else}
	<ul class="divide-y divide-hair">
		{#each occurrences as o (o.taskId)}
			<li class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5">
				<div class="min-w-0">
					<a href={resolve('/admin/tasks/[id]', { id: o.taskId })} class="font-semibold">
						{formatWhen(o)}
					</a>
					{#if o.assignees.length > 0}
						<p class="text-small text-muted">{o.assignees.join(', ')}</p>
					{/if}
				</div>
				<div class="flex flex-wrap gap-1.5">
					{#if o.manual}<Badge outline>{m.admin_series_occ_manual()}</Badge>{/if}
					{#if o.edited}<Badge outline>{m.admin_series_occ_edited()}</Badge>{/if}
					{#if o.free > 0}
						<Badge outline>{m.task_shifts_free({ free: o.free, total: o.total })}</Badge>
					{:else}
						<Badge tone="success">{m.task_shifts_full()}</Badge>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{/if}
