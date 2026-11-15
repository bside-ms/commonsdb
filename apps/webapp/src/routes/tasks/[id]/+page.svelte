<!--
	Task detail with one primary action: take it, or give it back.

	"Übernehmen" asks for confirmation in a modal, but only with JS: the
	button is a real submit button, and its click handler opens the modal
	instead. Without JS the click just submits the form. The modal's
	confirm button submits the same form through the `form` attribute
	(the modal is portalled out of the <form>).
-->
<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { formatHours, formatWhen } from '#lib/format.ts';
	import { Badge, Button, Card, FormField, Modal, RichText, Textarea, toast } from '#lib/ui';
	import { memberTask, release, report, take } from '../tasks.remote';

	const task = $derived(await memberTask(page.params.id!));

	const takeForm = $derived(take.for(task.shift.id));
	const releaseForm = $derived(release.for(task.shift.id));
	const reportForm = $derived(report.for(task.shift.id));
	const issues = $derived([
		...(takeForm.fields.issues() ?? []),
		...(releaseForm.fields.issues() ?? []),
		...(reportForm.fields.issues() ?? [])
	]);
	const noteError = $derived.by(() => {
		const issue = reportForm.fields.note.issues()?.[0];
		return issue ? errorMessage(issue.message) : undefined;
	});

	let confirmOpen = $state(false);
	const formId = $props.id();

	const facts = $derived(
		[
			[m.task_when(), formatWhen(task)],
			[m.task_duration(), formatHours(task.shift.hoursTenths)],
			[m.task_place(), task.place],
			[m.task_contact(), task.contact],
			[m.task_bring(), task.bring],
			[m.task_physical_demands(), task.physicalDemands]
		].filter((f): f is [string, string] => Boolean(f[1]))
	);
</script>

<svelte:head><title>{task.title} · {m.app_name()}</title></svelte:head>

<a href={resolve('/tasks')} class="inline-flex items-center gap-1.5 text-small font-semibold">
	<ArrowLeft class="size-4" strokeWidth={2} aria-hidden="true" />
	{m.tasks_back()}
</a>

<div class="mt-4 flex flex-wrap gap-1.5">
	{#if task.urgent}
		<Badge tone="attention">{m.task_urgent()}</Badge>
	{/if}
	<Badge outline>{task.category.name}</Badge>
</div>
<h1 class="mt-2">{task.title}</h1>

<div class="mt-6 grid max-w-4xl gap-6 lg:grid-cols-[1fr_18rem] lg:items-start">
	<div class="grid gap-6">
		<dl class="grid gap-x-6 gap-y-2.5 text-small sm:grid-cols-[max-content_1fr]">
			{#each facts as [label, value] (label)}
				<dt class="font-semibold text-muted">{label}</dt>
				<dd class="whitespace-pre-line">{value}</dd>
			{/each}
		</dl>

		{#if task.selfService}
			<p class="border-l-4 border-area-commons pl-3 text-small">{m.task_self_service_info()}</p>
		{/if}

		<RichText html={task.descriptionHtml} />
	</div>

	<!-- the one thing to do here; sticks on large screens -->
	<Card class="lg:sticky lg:top-4">
		{#if task.shift.mine && task.shift.status === 'confirmed'}
			<Badge tone="success">{m.task_status_confirmed()}</Badge>
			<p class="mt-2 text-small text-muted">{m.task_confirmed_info()}</p>
		{:else if task.shift.mine && task.shift.status === 'reported'}
			<Badge tone="info">{m.task_status_reported()}</Badge>
			<p class="mt-2 text-small text-muted">{m.task_reported_info()}</p>
			{#if task.notes?.report}
				<p class="mt-3 text-small font-semibold">{m.task_your_note()}</p>
				<p class="text-small whitespace-pre-line">{task.notes.report}</p>
			{/if}
		{:else if task.shift.mine}
			{#if task.notes?.sentBack}
				<div role="status" class="mb-4 border-l-4 border-accent pl-3 text-small">
					<p class="font-semibold">{m.task_sent_back_title()}</p>
					<p class="whitespace-pre-line">{task.notes.sentBack}</p>
				</div>
			{/if}
			<p class="font-semibold">{m.task_you_took_it()}</p>
			<p class="mt-1 text-small text-muted">{m.task_report_hint()}</p>
			<form
				{...reportForm.enhance(async ({ submit }) => {
					if (await submit()) toast(m.task_reported_toast());
				})}
				class="mt-4 grid gap-3"
			>
				<input {...reportForm.fields.shiftId.as('hidden', task.shift.id)} />
				<FormField label={m.task_report_note()} error={noteError} optional>
					<Textarea {...reportForm.fields.note.as('text')} rows={3} maxlength={1000} />
				</FormField>
				<Button type="submit" variant="accent" block disabled={reportForm.pending > 0}>
					{m.task_report()}
				</Button>
			</form>
			<form
				{...releaseForm.enhance(async ({ submit }) => {
					if (await submit()) toast(m.task_released_toast());
				})}
				class="mt-2"
			>
				<input {...releaseForm.fields.shiftId.as('hidden', task.shift.id)} />
				<Button type="submit" variant="ghost" block disabled={releaseForm.pending > 0}>
					{m.task_release()}
				</Button>
			</form>
		{:else}
			<p class="text-small text-muted">{m.task_take_hint()}</p>
			<form
				id={formId}
				{...takeForm.enhance(async ({ submit }) => {
					confirmOpen = false;
					if (await submit()) toast(m.task_taken_toast());
				})}
				class="mt-4"
			>
				<input {...takeForm.fields.shiftId.as('hidden', task.shift.id)} />
				<Button
					type="submit"
					variant="accent"
					block
					disabled={takeForm.pending > 0}
					onclick={(e) => {
						e.preventDefault();
						confirmOpen = true;
					}}
				>
					{m.task_take()}
				</Button>
			</form>
		{/if}

		{#each issues as issue (issue.message)}
			<p role="alert" class="mt-3 text-small font-semibold text-danger">
				{errorMessage(issue.message)}
			</p>
		{/each}
	</Card>
</div>

<Modal
	bind:open={confirmOpen}
	title={m.task_take_confirm_title()}
	description={m.task_take_confirm_text({ when: formatWhen(task) })}
>
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (confirmOpen = false)}>{m.ui_cancel()}</Button>
		<Button type="submit" form={formId}>{m.task_take()}</Button>
	{/snippet}
</Modal>
