<!--
	Mark a task for an Aktion, or unmark it (actionId null). One form per
	row; `.for()` keeps their pending/issue states apart.
-->
<script lang="ts">
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { Button } from '#lib/ui';
	import { markTask } from './actions.remote';

	type Props = { taskId: string; actionId: string | null; label: string };
	let { taskId, actionId, label }: Props = $props();

	const f = $derived(markTask.for(`${taskId}:${actionId ?? '-'}`));
</script>

<form {...f} class="flex items-center gap-2">
	<input {...f.fields.taskId.as('hidden', taskId)} />
	<input {...f.fields.actionId.as('hidden', actionId ?? '')} />
	<Button type="submit" size="sm" variant="ghost" disabled={f.pending > 0}>{label}</Button>
	{#each f.fields.issues() ?? [] as issue (issue.message)}
		<span role="alert" class="text-small font-semibold text-danger"
			>{errorMessage(issue.message)}</span
		>
	{/each}
</form>
