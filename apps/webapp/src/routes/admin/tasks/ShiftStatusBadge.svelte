<!--
	Status of one shift for admins, with the holder's name where there is one.
	Used by the task list (single-shift tasks) and the edit page.
-->
<script lang="ts">
	import type { AdminShift } from '@commonsdb/core';
	import { m } from '#lib/paraglide/messages.js';
	import { Badge } from '#lib/ui';

	let { shift }: { shift: Pick<AdminShift, 'status' | 'assigneeName' | 'guest'> } = $props();
	const name = $derived(shift.assigneeName ?? (shift.guest ? m.action_guest() : '—'));
</script>

{#if shift.status === 'open'}
	<Badge outline>{m.task_status_open()}</Badge>
{:else if shift.status === 'reported'}
	<Badge tone="info">{name ? m.task_reported_by({ name }) : m.task_status_reported()}</Badge>
{:else if shift.status === 'confirmed'}
	<Badge tone="success">{m.task_status_confirmed()}</Badge>
{:else}
	<Badge>{name ? m.task_taken_by({ name }) : m.task_status_taken()}</Badge>
{/if}
