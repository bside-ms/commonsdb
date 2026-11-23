<!--
	Vorschläge: report something (a broken gutter, an idea) and follow
	what happened to it. Admins turn it into a task or decline it.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { ACCEPTED_TYPES } from '@commonsdb/media/kinds';
	import { m } from '#lib/paraglide/messages.js';
	import { fieldError as err, errorMessage } from '#lib/i18n/errors.ts';
	import {
		Badge,
		Button,
		Card,
		EmptyState,
		FileInput,
		FormField,
		Input,
		Select,
		Textarea
	} from '#lib/ui';
	import { mySuggestions, submitSuggestion, suggestionCategories } from './suggestions.remote';

	const [mine, groups] = $derived(await Promise.all([mySuggestions(), suggestionCategories()]));
	const categoryGroups = $derived(
		groups.map((g) => ({
			label: g.name,
			options: g.categories.map((c) => ({ value: c.id, label: c.name }))
		}))
	);
	const f = submitSuggestion.fields;

	const statusLabel = {
		open: m.suggestion_status_open,
		converted: m.suggestion_status_converted,
		rejected: m.suggestion_status_rejected
	};
</script>

<svelte:head><title>{m.suggestions_title()} · {m.app_name()}</title></svelte:head>

<h1>{m.suggestions_title()}</h1>
<p class="mt-2 max-w-prose text-muted">{m.suggestions_intro()}</p>

<form {...submitSuggestion} enctype="multipart/form-data" class="mt-6 grid max-w-2xl gap-5">
	<FormField label={m.suggestion_field_title()} error={err(f.title)}>
		<Input {...f.title.as('text')} maxlength={200} />
	</FormField>
	<FormField label={m.suggestion_field_body()} optional error={err(f.body)}>
		<Textarea {...f.body.as('text')} rows={4} maxlength={4000} />
	</FormField>
	<FormField label={m.suggestion_field_place()} optional error={err(f.place)}>
		<Input {...f.place.as('text')} maxlength={200} />
	</FormField>
	<FormField
		label={m.suggestion_field_category()}
		hint={m.suggestion_field_category_hint()}
		optional
		error={err(f.categoryId)}
	>
		<Select
			{...f.categoryId.as('select')}
			placeholder={m.suggestion_category_unknown()}
			groups={categoryGroups}
		/>
	</FormField>
	<FormField label={m.suggestion_field_image()} optional error={err(f.image)}>
		<FileInput {...f.image.as('file')} accept={ACCEPTED_TYPES.join(',')} />
	</FormField>

	{#each f.issues() ?? [] as issue (issue.message)}
		<p role="alert" class="text-small font-semibold text-danger">{errorMessage(issue.message)}</p>
	{/each}
	{#if submitSuggestion.result?.done}
		<p role="status" class="text-small font-semibold">{m.suggestion_sent()}</p>
	{/if}
	<div><Button type="submit">{m.suggestion_submit()}</Button></div>
</form>

<section class="mt-10" aria-labelledby="mine-heading">
	<h2 id="mine-heading">{m.suggestions_mine()}</h2>
	{#if mine.length === 0}
		<EmptyState class="mt-3" title={m.suggestions_none()} />
	{:else}
		<ul class="mt-3 grid gap-3">
			{#each mine as s (s.id)}
				<li>
					<Card class="grid gap-1 p-4">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<span class="font-semibold">{s.title}</span>
							<Badge outline={s.status !== 'open'}>{statusLabel[s.status]()}</Badge>
						</div>
						{#if s.status === 'converted' && s.taskId}
							<a class="text-small underline" href={resolve('/tasks/[id]', { id: s.taskId })}
								>{m.suggestion_to_task()}</a
							>
						{:else if s.status === 'rejected' && s.rejectionNote}
							<p class="text-small text-muted">{s.rejectionNote}</p>
						{/if}
					</Card>
				</li>
			{/each}
		</ul>
	{/if}
</section>
