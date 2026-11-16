<!--
	One series: its upcoming occurrences, adding a date by hand, pausing,
	ending and deleting it, and the edit form.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError as err } from '#lib/i18n/errors.ts';
	import { formatDate } from '#lib/format.ts';
	import { Badge, Button, Card, FormField, Input, toast } from '#lib/ui';
	import { manageableCategories } from '../../tasks/tasks.remote';
	import Occurrences from '../Occurrences.svelte';
	import SeriesForm from '../SeriesForm.svelte';
	import { ruleText } from '../rule-text.ts';
	import { addDate, adminSeries, end, pause, remove, resume } from '../series.remote';

	const [series, categories] = $derived(
		await Promise.all([adminSeries(page.params.id!), manageableCategories()])
	);

	const pauseForm = $derived(pause.for(series.id));
	const resumeForm = $derived(resume.for(series.id));
	const removeForm = $derived(remove.for(series.id));
	const endForm = $derived(end.for(series.id));
	const addForm = $derived(addDate.for(series.id));

	const day = (iso: string) => {
		const [y, mo, d] = iso.split('-').map(Number);
		return formatDate(new Date(y, mo - 1, d));
	};
</script>

<svelte:head><title>{series.title} · {m.app_name()}</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<p class="text-caps text-muted uppercase">{m.admin_series_edit_title()}</p>
		<h1 class="mt-1">{series.title}</h1>
		<p class="mt-1 text-muted">{ruleText(series.rule)}</p>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		{#if series.state === 'paused'}
			<Badge>{m.admin_series_state_paused()}</Badge>
			<form
				{...resumeForm.enhance(async ({ submit }) => {
					if (await submit()) toast(m.admin_series_resumed_toast());
				})}
			>
				<input {...resumeForm.fields.id.as('hidden', series.id)} />
				<Button type="submit" size="sm" variant="ghost">{m.admin_series_resume()}</Button>
			</form>
		{:else}
			{#if series.state === 'ended'}<Badge>{m.admin_series_state_ended()}</Badge>{/if}
			<form
				{...pauseForm.enhance(async ({ submit }) => {
					if (await submit()) toast(m.admin_series_paused_toast());
				})}
			>
				<input {...pauseForm.fields.id.as('hidden', series.id)} />
				<Button type="submit" size="sm" variant="ghost">{m.admin_series_pause()}</Button>
			</form>
		{/if}
		<form
			{...removeForm.enhance(async ({ submit }) => {
				await submit();
				toast(m.admin_series_deleted_toast());
			})}
		>
			<input {...removeForm.fields.id.as('hidden', series.id)} />
			<Button type="submit" size="sm" variant="ghost" tone="danger">
				{m.admin_series_delete()}
			</Button>
		</form>
	</div>
</div>

<div class="mt-6 grid max-w-3xl gap-6">
	<Card title={m.admin_series_upcoming()}>
		<Occurrences occurrences={series.upcoming} state={series.state} rule={series.rule} />

		<form
			{...addForm.enhance(async ({ element, submit }) => {
				if (await submit()) {
					element.reset();
					toast(m.admin_series_occurrence_added_toast());
				}
			})}
			class="mt-5 grid gap-3 border-t border-hair pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
		>
			<p class="text-small text-muted sm:col-span-3">{m.admin_series_add_occurrence_hint()}</p>
			<input {...addForm.fields.id.as('hidden', series.id)} />
			<FormField label={m.task_starts_on()} error={err(addForm.fields.startsOn)}>
				<Input {...addForm.fields.startsOn.as('date')} required />
			</FormField>
			<FormField label={m.task_ends_on()} error={err(addForm.fields.endsOn)} optional>
				<Input {...addForm.fields.endsOn.as('date')} />
			</FormField>
			<Button type="submit" variant="ghost" disabled={addForm.pending > 0}>
				{m.admin_series_add_occurrence()}
			</Button>
			{#each addForm.fields.issues() ?? [] as issue (issue.message)}
				<p role="alert" class="text-small font-semibold text-danger sm:col-span-3">
					{errorMessage(issue.message)}
				</p>
			{/each}
		</form>
	</Card>

	{#if series.state !== 'ended'}
		<Card title={m.admin_series_end()}>
			<form
				{...endForm.enhance(async ({ submit }) => {
					if ((await submit()) && endForm.result?.until)
						toast(m.admin_series_ended_toast({ date: day(endForm.result.until) }));
				})}
				class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
			>
				<p class="text-small text-muted sm:col-span-2">{m.admin_series_end_hint()}</p>
				<input {...endForm.fields.id.as('hidden', series.id)} />
				<FormField label={m.admin_series_end_on()} error={err(endForm.fields.until)}>
					<Input {...endForm.fields.until.as('date', series.until ?? '')} required />
				</FormField>
				<Button type="submit" variant="ghost" disabled={endForm.pending > 0}>
					{m.admin_series_end()}
				</Button>
			</form>
		</Card>
	{/if}

	<div class="border border-ink bg-paper p-4 sm:p-6">
		{#key series.id}
			<SeriesForm {series} {categories} cancelHref={resolve('/admin/series')} />
		{/key}
	</div>
</div>
