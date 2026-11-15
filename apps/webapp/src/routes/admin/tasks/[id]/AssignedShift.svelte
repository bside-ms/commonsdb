<!--
	One shift that someone holds, on the admin edit page. Its own component
	so each row owns its release form (see TaskRow).
-->
<script lang="ts">
	import type { AdminShift } from '@commonsdb/core';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { formatHours, formatShiftTime } from '#lib/format.ts';
	import { Button, toast } from '#lib/ui';
	import ShiftStatusBadge from '../ShiftStatusBadge.svelte';
	import { releaseAssignee } from '../tasks.remote';

	let { shift }: { shift: AdminShift } = $props();

	const rel = $derived(releaseAssignee.for(shift.id));
</script>

<li class="flex flex-wrap items-center justify-between gap-3 py-2.5">
	<div class="flex flex-wrap items-center gap-2">
		<span class="text-small">{formatShiftTime(shift)} · {formatHours(shift.hoursTenths)}</span>
		<ShiftStatusBadge {shift} />
	</div>
	{#if shift.status === 'taken'}
		<form
			{...rel.enhance(async ({ submit }) => {
				if (await submit()) toast(m.admin_task_released_toast());
			})}
		>
			<input {...rel.fields.id.as('hidden', shift.id)} />
			<Button type="submit" size="sm" variant="ghost" disabled={rel.pending > 0}>
				{m.admin_task_release()}
			</Button>
		</form>
	{/if}
	{#each rel.fields.issues() ?? [] as issue (issue.message)}
		<p role="alert" class="w-full text-small font-semibold text-danger">
			{errorMessage(issue.message)}
		</p>
	{/each}
</li>
