<!--
	Task detail with one primary action for the member: take a shift, or
	act on the one they hold (report it, give it back).

	A task can have several shifts. The member holds at most one; with more
	than one free, they pick it with radio buttons inside the take form, so
	there is still one form, one button and one confirmation.

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
	import { formatHours, formatHoursRange, formatShiftTime, formatWhen } from '#lib/format.ts';
	import { mediaUrl } from '#lib/media.ts';
	import { Badge, Button, Card, FormField, Modal, RichText, Textarea, Thumb, toast } from '#lib/ui';
	import { memberTask, release, report, take } from '../tasks.remote';
	import { taskChat } from '../../messages/messages.remote';

	const task = $derived(await memberTask(page.params.id!));

	/** The member's own shift on this task, whatever its status. */
	const mine = $derived(task.shifts.find((s) => s.mine));
	const free = $derived(task.shifts.filter((s) => s.status === 'open'));
	const several = $derived(task.shifts.length > 1);

	// take: one plain form; the shift comes from a radio (or a hidden input)
	const takeForm = take;
	const releaseForm = $derived(release.for(mine?.id ?? ''));
	const reportForm = $derived(report.for(mine?.id ?? ''));
	const issues = $derived([
		...(takeForm.fields.issues() ?? []),
		...(mine ? (releaseForm.fields.issues() ?? []) : []),
		...(mine ? (reportForm.fields.issues() ?? []) : [])
	]);
	const noteError = $derived.by(() => {
		const issue = reportForm.fields.note.issues()?.[0];
		return issue ? errorMessage(issue.message) : undefined;
	});
	const chatForm = $derived(taskChat.for(task.id));

	let confirmOpen = $state(false);
	const formId = $props.id();

	const facts = $derived(
		[
			[m.task_when(), formatWhen(task)],
			[
				m.task_duration(),
				mine ? formatHours(mine.hoursTenths) : formatHoursRange(task.summary.hoursTenths)
			],
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
	{#if task.summary.together}
		<Badge tone="success">{m.task_together()}</Badge>
	{/if}
	<Badge outline>{task.category.name}</Badge>
</div>
<h1 class="mt-2">{task.title}</h1>

<Thumb
	size="lg"
	class="mt-4"
	seed={task.seriesId ?? task.id}
	src={task.image && mediaUrl(task.image.id, 'large')}
	alt={task.image?.alt}
/>

<div class="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-start">
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

		{#if several}
			<section aria-labelledby="shifts-heading">
				<h2 id="shifts-heading" class="text-h3">{m.task_shifts_title()}</h2>
				{#if task.summary.parallel > 1}
					<p class="mt-1 text-small text-muted">
						{m.task_parallel({ count: task.summary.parallel })}
					</p>
				{/if}
				<ul class="mt-2 divide-y divide-hair border border-ink bg-paper">
					{#each task.shifts as shift (shift.id)}
						<li class="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-small">
							<span>{formatShiftTime(shift)} · {formatHours(shift.hoursTenths)}</span>
							{#if shift.mine}
								<Badge tone="neutral">{m.task_shift_you()}</Badge>
							{:else if shift.status === 'open'}
								<Badge outline>{m.task_shift_free()}</Badge>
							{:else}
								<span class="font-semibold"
									>{shift.assigneeName ?? (shift.guest ? m.action_guest() : '—')}</span
								>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<RichText html={task.descriptionHtml} />

		{#if task.links.length > 0}
			<section aria-labelledby="wiki-heading">
				<h2 id="wiki-heading" class="text-h3">{m.task_wiki_title()}</h2>
				<ul class="mt-2 grid gap-3">
					{#each task.links as link (link.key)}
						<li class="border-l-4 border-area-qual pl-3">
							{#if link.slug}
								<a href={resolve('/wiki/[slug]', { slug: link.slug })} class="font-semibold"
									>{link.title}</a
								>
								{#if link.preview}
									<p class="mt-0.5 text-small text-muted">{link.preview}</p>
								{/if}
							{:else}
								<span class="font-semibold text-muted">{link.title}</span>
								<p class="mt-0.5 text-small text-muted">{m.wiki_link_unavailable()}</p>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- the task chat is for people on a shift; anyone can ask the admins -->
		<div class="flex flex-wrap gap-2">
			{#if mine}
				<form {...chatForm}>
					<input {...chatForm.fields.taskId.as('hidden', task.id)} />
					<Button type="submit" size="sm" variant="ghost">{m.task_chat()}</Button>
				</form>
			{/if}
			<Button size="sm" variant="ghost" href={`${resolve('/messages/admins')}?task=${task.id}`}>
				{m.task_ask_admins()}
			</Button>
		</div>
	</div>

	<!-- the one thing to do here; sticks on large screens -->
	<Card class="lg:sticky lg:top-4">
		{#if mine?.status === 'confirmed'}
			<Badge tone="success">{m.task_status_confirmed()}</Badge>
			<p class="mt-2 text-small text-muted">{m.task_confirmed_info()}</p>
		{:else if mine?.status === 'reported'}
			<Badge tone="info">{m.task_status_reported()}</Badge>
			<p class="mt-2 text-small text-muted">{m.task_reported_info()}</p>
			{#if mine.notes?.report}
				<p class="mt-3 text-small font-semibold">{m.task_your_note()}</p>
				<p class="text-small whitespace-pre-line">{mine.notes.report}</p>
			{/if}
		{:else if mine}
			{#if mine.notes?.sentBack}
				<div role="status" class="mb-4 border-l-4 border-accent pl-3 text-small">
					<p class="font-semibold">{m.task_sent_back_title()}</p>
					<p class="whitespace-pre-line">{mine.notes.sentBack}</p>
				</div>
			{/if}
			<p class="font-semibold">{m.task_you_took_it()}</p>
			{#if several}
				<p class="mt-1 text-small">{formatShiftTime(mine)} · {formatHours(mine.hoursTenths)}</p>
			{/if}
			<p class="mt-1 text-small text-muted">{m.task_report_hint()}</p>
			<form
				{...reportForm.enhance(async ({ submit }) => {
					if (await submit()) toast(m.task_reported_toast());
				})}
				class="mt-4 grid gap-3"
			>
				<input {...reportForm.fields.shiftId.as('hidden', mine.id)} />
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
				<input {...releaseForm.fields.shiftId.as('hidden', mine.id)} />
				<Button type="submit" variant="ghost" block disabled={releaseForm.pending > 0}>
					{m.task_release()}
				</Button>
			</form>
		{:else if free.length > 0}
			<p class="text-small text-muted">{m.task_take_hint()}</p>
			<form
				id={formId}
				{...takeForm.enhance(async ({ submit }) => {
					confirmOpen = false;
					if (await submit()) toast(m.task_taken_toast());
				})}
				class="mt-4 grid gap-3"
			>
				{#if free.length === 1}
					<input {...takeForm.fields.shiftId.as('hidden', free[0].id)} />
				{:else}
					<fieldset class="grid gap-2">
						<legend class="mb-1 text-small font-semibold">{m.task_take_choose()}</legend>
						{#each free as shift, i (shift.id)}
							<label class="flex cursor-pointer items-center gap-2.5 text-small">
								<input
									{...takeForm.fields.shiftId.as('radio', shift.id, i === 0)}
									class="size-4.5 accent-ink"
								/>
								{formatShiftTime(shift)} · {formatHours(shift.hoursTenths)}
							</label>
						{/each}
					</fieldset>
				{/if}
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
