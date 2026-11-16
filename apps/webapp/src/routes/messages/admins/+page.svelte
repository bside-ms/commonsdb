<!--
	"Nachricht an die Admins": reaches every admin; whoever answers first
	takes it on. ?task=<id> (from a task page) attaches the task.
-->
<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { isAllowedHref, profiles } from '@commonsdb/richtext';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError } from '#lib/i18n/errors.ts';
	import { Button, Editor, FormField, Input } from '#lib/ui';
	import { memberTask } from '../../tasks/tasks.remote';
	import { sendToAdmins } from '../messages.remote';

	const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const taskId = $derived(page.url.searchParams.get('task') ?? '');
	const task = $derived(UUID.test(taskId) ? await memberTask(taskId) : null);
	const f = sendToAdmins.fields;
</script>

<svelte:head><title>{m.messages_new_admins()} · {m.app_name()}</title></svelte:head>

<a href={resolve('/messages')} class="inline-flex items-center gap-1.5 text-small font-semibold">
	<ArrowLeft class="size-4" strokeWidth={2} aria-hidden="true" />
	{m.messages_back()}
</a>
<h1 class="mt-4">{m.messages_new_admins()}</h1>
<p class="mt-3 max-w-prose text-small text-muted">{m.messages_admins_intro()}</p>

<form {...sendToAdmins} class="mt-6 grid max-w-2xl gap-6">
	{#if task}
		<input {...f.taskId.as('hidden', task.id)} />
		<p class="border-l-4 border-area-tasks pl-3 text-small">
			{m.messages_to_task({ title: task.title })}
		</p>
	{/if}

	<FormField label={m.messages_subject()} optional error={fieldError(f.subject)}>
		<Input
			{...f.subject.as('text', task ? task.title : '')}
			maxlength={200}
			placeholder={m.messages_subject_placeholder()}
		/>
	</FormField>

	<FormField label={m.messages_body()} error={fieldError(f.body)}>
		<Editor
			name={f.body.as('hidden', '').name}
			extensions={profiles.message()}
			variant="message"
			{isAllowedHref}
		/>
	</FormField>

	{#each [...(f.issues() ?? []), ...(f.taskId.issues() ?? [])] as issue (issue.message)}
		<p role="alert" class="font-semibold text-danger">{errorMessage(issue.message)}</p>
	{/each}

	<div class="flex flex-wrap gap-3">
		<Button type="submit" disabled={sendToAdmins.pending > 0}>{m.messages_send()}</Button>
		<Button variant="ghost" href={resolve('/messages')}>{m.ui_cancel()}</Button>
	</div>
</form>
