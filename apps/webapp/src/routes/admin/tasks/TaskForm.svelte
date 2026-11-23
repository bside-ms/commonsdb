<!--
	Create/edit form for a task. Lives next to its routes, not in lib/ui:
	it's domain UI, used by /admin/tasks/new and /admin/tasks/[id]. The
	parts it shares with the series form are in TemplateFields.svelte; the
	"when" is its own.

	Every input comes from `form.fields.<name>.as(...)`. That gives it a
	name SvelteKit recognises (unknown fields are rejected), the initial
	value, and aria-invalid. Issues come back per field as codes from core.
-->
<script lang="ts">
	import type { AdminTask, CategoryGroup } from '@commonsdb/core';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError as err } from '#lib/i18n/errors.ts';
	import { Button, FormField, Input } from '#lib/ui';
	import TemplateFields from './TemplateFields.svelte';
	import { templateInitial } from './template.ts';
	import { saveTask } from './tasks.remote';

	type Props = {
		/** The task to edit; omit to create a new one. */
		task?: AdminTask & { descriptionHtml: string };
		categories: CategoryGroup[];
		cancelHref: string;
		/** Converting a suggestion: start from its fields, post its id (see saveTask). */
		fromSuggestion?: {
			id: string;
			prefill: NonNullable<Parameters<typeof templateInitial>[0]>;
			descriptionHtml: string;
		};
	};

	let { task, categories, cancelHref, fromSuggestion }: Props = $props();

	// Editing: one form instance per task (`for` is keyed by the id, and
	// also posts it). Creating: the plain form, so no id is sent.
	const form = $derived(task ? saveTask.for(task.id) : saveTask);
	const f = $derived(form.fields);

	/** Initial values: the stored task, or sensible defaults for a new one. */
	const initial = $derived({
		...templateInitial(task ?? fromSuggestion?.prefill, task?.shifts),
		whenKind: task?.whenKind ?? 'date',
		startsOn: task?.startsOn ?? '',
		endsOn: task?.endsOn ?? ''
	});
</script>

<!-- multipart: the photo is a file (remote forms don't add it on their own) -->
<form {...form} enctype="multipart/form-data" class="grid gap-8">
	{#if task}<input {...f.id.as('hidden', task.id)} />{/if}
	{#if fromSuggestion}<input {...f.suggestionId.as('hidden', fromSuggestion.id)} />{/if}

	<TemplateFields
		fields={f}
		{initial}
		{categories}
		descriptionHtml={task?.descriptionHtml ?? fromSuggestion?.descriptionHtml}
		stored={task?.shifts}
		imageSeed={task ? (task.series?.id ?? task.id) : fromSuggestion?.id}
	>
		{#snippet when()}
			<fieldset class="when grid gap-5 sm:grid-cols-2">
				<legend class="mb-4 text-h3">{m.task_section_when()}</legend>

				<div class="grid gap-2 sm:col-span-2" role="radiogroup" aria-label={m.task_when()}>
					{#each [['date', m.task_when_date()], ['range', m.task_when_range()]] as const as [kind, label] (kind)}
						<label class="flex cursor-pointer items-center gap-2.5">
							<input
								{...f.whenKind.as('radio', kind, initial.whenKind === kind)}
								class="size-4.5 accent-ink"
							/>
							{label}
						</label>
					{/each}
				</div>

				<FormField label={m.task_starts_on()} error={err(f.startsOn)}>
					<Input {...f.startsOn.as('date', initial.startsOn)} required />
				</FormField>

				<!-- Shown only for "range". Pure CSS (:has), so it works without JS. -->
				<div class="ends-on">
					<FormField label={m.task_ends_on()} error={err(f.endsOn)}>
						<Input {...f.endsOn.as('date', initial.endsOn)} />
					</FormField>
				</div>
			</fieldset>
		{/snippet}
	</TemplateFields>

	{#each f.issues() ?? [] as issue (issue.message)}
		<p role="alert" class="font-semibold text-danger">{errorMessage(issue.message)}</p>
	{/each}

	<div class="flex flex-wrap gap-3">
		<Button type="submit" disabled={form.pending > 0}>
			{task ? m.admin_task_save() : m.admin_task_create()}
		</Button>
		<Button variant="ghost" href={cancelHref}>{m.ui_cancel()}</Button>
	</div>
</form>

<style>
	.ends-on {
		display: none;
	}
	.when:has(input[value='range']:checked) .ends-on {
		display: block;
	}
</style>
