<!--
	One reported shift. Confirm is the main action (hours prefilled, thanks
	optional); sending back sits in a <details>, so it needs no JS and stays
	out of the way until wanted.
-->
<script lang="ts">
	import type { ConfirmationItem } from '@commonsdb/core';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { formatDate, formatHours, formatWhen, hoursValue } from '#lib/format.ts';
	import { Badge, Button, FormField, Input, Textarea, toast } from '#lib/ui';
	import { confirm, sendBack } from './confirmations.remote';

	let { item }: { item: ConfirmationItem } = $props();

	const confirmForm = $derived(confirm.for(item.shiftId));
	const sendBackForm = $derived(sendBack.for(item.shiftId));

	const err = (field: { issues(): { message: string }[] | undefined }) => {
		const issue = field.issues()?.[0];
		return issue ? errorMessage(issue.message) : undefined;
	};
	// form-level errors (forbidden, someone was faster, …)
	const formIssues = $derived([
		...(confirmForm.fields.shiftId.issues() ?? []),
		...(sendBackForm.fields.shiftId.issues() ?? [])
	]);
</script>

<li class="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_22rem]">
	<div class="min-w-0">
		<div class="flex flex-wrap gap-1.5">
			<Badge outline>{item.category.name}</Badge>
			{#if item.task.deleted}
				<Badge>{m.task_deleted()}</Badge>
			{/if}
		</div>
		<h2 class="mt-1.5 text-h3">
			<a
				href={resolve('/admin/tasks/[id]', { id: item.task.id })}
				class="no-underline hover:underline"
			>
				{item.task.title}
			</a>
		</h2>
		<p class="mt-0.5 text-small text-muted">
			{formatWhen(item.task)} · {formatHours(item.hoursTenths)}
		</p>
		<p class="mt-2 text-small">
			{m.admin_confirmations_reported_by({
				name: item.assigneeName ?? m.admin_confirmations_unknown_member(),
				date: formatDate(item.reportedAt)
			})}
		</p>
		{#if item.reportNote}
			<blockquote class="mt-2 border-l-4 border-area-init pl-3 text-small whitespace-pre-line">
				{item.reportNote}
			</blockquote>
		{/if}
	</div>

	<div class="grid content-start gap-3">
		{#if item.canConfirm}
			<form
				{...confirmForm.enhance(async ({ submit }) => {
					if (await submit()) toast(m.admin_confirmations_confirmed_toast());
				})}
				class="grid gap-3"
			>
				<input {...confirmForm.fields.shiftId.as('hidden', item.shiftId)} />
				<FormField
					label={m.task_hours()}
					hint={m.admin_confirmations_hours_hint()}
					error={err(confirmForm.fields.hours)}
				>
					<Input
						{...confirmForm.fields.hours.as('text', hoursValue(item.hoursTenths))}
						inputmode="decimal"
						required
						class="max-w-32"
					/>
				</FormField>
				<FormField
					label={m.admin_confirmations_thanks()}
					error={err(confirmForm.fields.note)}
					optional
				>
					<Textarea {...confirmForm.fields.note.as('text')} rows={2} maxlength={1000} />
				</FormField>
				<Button type="submit" variant="accent" block disabled={confirmForm.pending > 0}>
					{m.admin_confirmations_confirm()}
				</Button>
			</form>
		{:else}
			<p class="text-small text-muted">
				{item.own ? m.admin_confirmations_own_hint() : m.admin_confirmations_no_assignee_hint()}
			</p>
		{/if}

		<details class="text-small">
			<summary class="cursor-pointer font-semibold">{m.admin_confirmations_send_back()}</summary>
			<form
				{...sendBackForm.enhance(async ({ submit }) => {
					if (await submit()) toast(m.admin_confirmations_sent_back_toast());
				})}
				class="mt-3 grid gap-3"
			>
				<input {...sendBackForm.fields.shiftId.as('hidden', item.shiftId)} />
				<FormField
					label={m.admin_confirmations_send_back_reason()}
					hint={m.admin_confirmations_send_back_hint()}
					error={err(sendBackForm.fields.note)}
				>
					<Textarea {...sendBackForm.fields.note.as('text')} rows={3} maxlength={1000} required />
				</FormField>
				<Button type="submit" variant="ghost" block disabled={sendBackForm.pending > 0}>
					{m.admin_confirmations_send_back_submit()}
				</Button>
			</form>
		</details>

		{#each formIssues as issue (issue.message)}
			<p role="alert" class="text-small font-semibold text-danger">
				{errorMessage(issue.message)}
			</p>
		{/each}
	</div>
</li>
