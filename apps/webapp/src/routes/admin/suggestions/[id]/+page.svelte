<!--
	One suggestion. Open: the member's report on top, then the task form
	pre-filled from it (saving converts, see saveTask), and declining in a
	<details> at the end, so it needs no JS and stays out of the way.
	Handled: just what happened.
-->
<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError as err } from '#lib/i18n/errors.ts';
	import { formatDate } from '#lib/format.ts';
	import { mediaUrl } from '#lib/media.ts';
	import { Badge, Button, FormField, Textarea, Thumb } from '#lib/ui';
	import TaskForm from '../../tasks/TaskForm.svelte';
	import { adminSuggestion, reject } from '../suggestions.remote';

	const data = $derived(await adminSuggestion(page.params.id!));
	const s = $derived(data.suggestion);
	const rejectForm = $derived(reject.for(s.id));
	const rejectIssues = $derived(rejectForm.fields.id.issues() ?? []);

	const statusLabel = {
		open: m.suggestion_status_open,
		converted: m.suggestion_status_converted,
		rejected: m.suggestion_status_rejected
	};
</script>

<svelte:head><title>{s.title} · {m.app_name()}</title></svelte:head>

<a
	href={resolve('/admin/suggestions')}
	class="inline-flex items-center gap-1.5 text-small font-semibold"
>
	<ArrowLeft class="size-4" strokeWidth={2} aria-hidden="true" />
	{m.admin_suggestions_back()}
</a>

<div class="mt-4">
	<p class="text-caps text-muted uppercase">{m.admin_suggestion_title()}</p>
	<h1 class="mt-1">{s.title}</h1>
</div>

<section
	class="mt-6 grid max-w-3xl gap-4 border border-ink bg-paper p-4 sm:grid-cols-[1fr_auto] sm:p-6"
	aria-label={m.admin_suggestion_report()}
>
	<div class="min-w-0">
		<div class="flex flex-wrap gap-1.5">
			<Badge outline>{s.categoryName ?? m.admin_suggestion_no_category()}</Badge>
			<Badge outline={s.status !== 'open'}>{statusLabel[s.status]()}</Badge>
		</div>
		<p class="mt-2 text-small text-muted">
			{m.admin_suggestion_by({
				name: s.author ?? m.admin_confirmations_unknown_member(),
				date: formatDate(s.createdAt)
			})}
			{#if s.place}· {s.place}{/if}
		</p>
		{#if s.body}
			<p class="mt-3 whitespace-pre-line">{s.body}</p>
		{/if}
	</div>
	{#if s.imageId}
		<a href={mediaUrl(s.imageId, 'large')} class="block">
			<Thumb seed={s.id} src={mediaUrl(s.imageId, 'thumb')} alt={m.admin_suggestion_photo()} />
		</a>
	{/if}
</section>

{#if s.status === 'open'}
	<section class="mt-10" aria-labelledby="convert-heading">
		<h2 id="convert-heading">{m.admin_suggestion_convert()}</h2>
		<p class="mt-1 max-w-prose text-small text-muted">{m.admin_suggestion_convert_hint()}</p>
		<div class="mt-4 max-w-3xl border border-ink bg-paper p-4 sm:p-6">
			<TaskForm
				categories={data.categories}
				cancelHref={resolve('/admin/suggestions')}
				fromSuggestion={{
					id: s.id,
					prefill: data.prefill,
					descriptionHtml: data.descriptionHtml
				}}
			/>
		</div>
	</section>

	<details class="mt-8 max-w-3xl border border-ink bg-paper">
		<summary class="cursor-pointer px-4 py-3 font-semibold">
			{m.admin_suggestion_reject()}
		</summary>
		<form {...rejectForm} class="grid gap-4 border-t border-ink p-4">
			<input {...rejectForm.fields.id.as('hidden', s.id)} />
			<FormField
				label={m.admin_suggestion_reject_note()}
				hint={m.admin_suggestion_reject_note_hint()}
				optional
				error={err(rejectForm.fields.note)}
			>
				<Textarea {...rejectForm.fields.note.as('text')} rows={3} maxlength={1000} />
			</FormField>
			{#each rejectIssues as issue (issue.message)}
				<p role="alert" class="text-small font-semibold text-danger">
					{errorMessage(issue.message)}
				</p>
			{/each}
			<div><Button type="submit" variant="ghost">{m.admin_suggestion_reject_submit()}</Button></div>
		</form>
	</details>
{:else}
	<section class="mt-8 max-w-3xl" aria-label={m.admin_suggestion_outcome()}>
		<p class="text-small">
			{s.status === 'converted'
				? m.admin_suggestion_converted_on({ date: formatDate(s.handledAt!) })
				: m.admin_suggestion_rejected_on({ date: formatDate(s.handledAt!) })}
		</p>
		{#if s.status === 'converted' && s.taskId}
			<Button class="mt-3" size="sm" href={resolve('/admin/tasks/[id]', { id: s.taskId })}>
				{m.admin_suggestion_open_task()}
			</Button>
		{:else if s.rejectionNote}
			<blockquote class="mt-3 border-l-4 border-area-init pl-3 text-small whitespace-pre-line">
				{s.rejectionNote}
			</blockquote>
		{/if}
	</section>
{/if}
