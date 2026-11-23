<!--
	The parts the task form and the series form share: what (title,
	category, description), the shift rows, the details and the linked
	wiki pages. The form's own "when" goes in between, through the `when`
	snippet.

	Shift rows live in the form's own state (fields.shifts.value()/set()),
	not in a separate $state: a failed submit (with or without JS) comes
	back with exactly the rows that were posted, and indices always match
	the input names.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { RemoteFormFields } from '$app/server';
	import type { AdminShift, CategoryGroup } from '@commonsdb/core';
	import { isAllowedHref, profiles } from '@commonsdb/richtext';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError as err } from '#lib/i18n/errors.ts';
	import { Button, Checkbox, Editor, FormField, Input, Select, Textarea } from '#lib/ui';
	import ImageField from './ImageField.svelte';
	import ShiftStatusBadge from './ShiftStatusBadge.svelte';
	import WikiLinks from './WikiLinks.svelte';
	import {
		EMPTY_SHIFT,
		type ShiftFormData,
		type TemplateFormData,
		type TemplateInitial
	} from './template.ts';

	type Props = {
		fields: RemoteFormFields<TemplateFormData>;
		initial: TemplateInitial;
		categories: CategoryGroup[];
		/** Pre-rendered description, so the editor shows it before JS. */
		descriptionHtml?: string;
		/** Stored shifts of a task: rows someone holds are locked. None for a series. */
		stored?: AdminShift[];
		/** Placeholder seed for the photo preview; none while creating. */
		imageSeed?: string;
		when: Snippet;
	};

	let {
		fields: f,
		initial,
		categories,
		descriptionHtml,
		stored = [],
		imageSeed,
		when
	}: Props = $props();

	// The editor posts through its own hidden input; it only needs the name.
	// After a failed submit without JS, value() holds what was posted.
	const descriptionField = $derived(f.description.as('hidden', initial.description));
	const descriptionDoc = $derived.by(() => {
		const raw = f.description.value() || initial.description;
		try {
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	});

	const categoryGroups = $derived(
		categories.map((g) => ({
			label: g.name,
			options: g.categories.map((c) => ({ value: c.id, label: c.name }))
		}))
	);

	// ---- shifts -----------------------------------------------------------------

	/** Rows were added or removed: from then on the form state holds all of them. */
	let reshaped = $state(false);

	const rows: ShiftFormData[] = $derived.by(() => {
		const posted = (f.shifts.value() ?? []) as Partial<ShiftFormData>[];
		const length = reshaped ? posted.length : Math.max(posted.length, initial.shifts.length);
		// before any add/remove, typed values only cover the fields touched so far
		return Array.from({ length }, (_, i) => ({
			...EMPTY_SHIFT,
			...(reshaped ? {} : initial.shifts[i]),
			...posted[i]
		}));
	});

	/** Stored shifts by id: status and holder for rows that already exist. */
	const held = $derived(new Map(stored.map((s) => [s.id, s])));

	function addShift() {
		reshaped = true;
		f.shifts.set([...rows, EMPTY_SHIFT]);
	}

	function removeShift(index: number) {
		reshaped = true;
		f.shifts.set(rows.filter((_, i) => i !== index));
	}

	/** 'HH:MM' strings compare like times; end ≤ start means the next day. */
	const endsNextDay = (r: ShiftFormData) =>
		r.startsTime !== '' && r.endsTime !== '' && r.endsTime <= r.startsTime;
</script>

<fieldset class="grid gap-5">
	<legend class="mb-4 text-h3">{m.task_section_what()}</legend>

	<FormField label={m.task_title()} error={err(f.title)}>
		<Input {...f.title.as('text', initial.title)} required maxlength={120} />
	</FormField>

	<FormField label={m.task_category()} error={err(f.categoryId)}>
		<Select
			{...f.categoryId.as('select', initial.categoryId)}
			groups={categoryGroups}
			placeholder={m.task_category_placeholder()}
			required
		/>
	</FormField>

	<FormField
		label={m.task_description()}
		hint={m.task_description_hint()}
		error={err(f.description)}
		optional
	>
		<Editor
			name={descriptionField.name}
			value={descriptionDoc}
			html={descriptionHtml}
			extensions={profiles.description()}
			{isAllowedHref}
		/>
	</FormField>

	<ImageField fields={f} {initial} seed={imageSeed} />
</fieldset>

{@render when()}

<fieldset class="grid gap-4">
	<legend class="mb-4 text-h3">{m.task_section_shifts()}</legend>
	<p class="text-small text-muted">{m.task_shifts_hint()}</p>

	<ol class="grid gap-3">
		{#each rows as row, i (i)}
			{@const field = f.shifts[i]}
			{@const shift = row.id ? held.get(row.id) : undefined}
			{@const locked = shift !== undefined && shift.status !== 'open'}
			<li class="grid gap-3 border border-ink p-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end">
				<input {...field.id.as('hidden', row.id)} />
				<FormField label={m.task_shift_from()} error={err(field.startsTime)} optional>
					<Input {...field.startsTime.as('time', row.startsTime)} readonly={locked} />
				</FormField>
				<FormField label={m.task_shift_to()} error={err(field.endsTime)} optional>
					<Input {...field.endsTime.as('time', row.endsTime)} readonly={locked} />
				</FormField>
				<FormField label={m.task_hours()} error={err(field.hours)}>
					<Input
						{...field.hours.as('text', row.hours)}
						inputmode="decimal"
						required
						readonly={shift?.status === 'confirmed'}
					/>
				</FormField>
				<div class="flex min-h-11 items-center">
					{#if locked}
						<ShiftStatusBadge {shift} />
					{:else if rows.length > 1}
						<Button
							type="button"
							size="sm"
							variant="ghost"
							tone="danger"
							onclick={() => removeShift(i)}
						>
							{m.task_shift_remove()}
						</Button>
					{/if}
				</div>
				{#if locked || endsNextDay(row)}
					<p class="text-small text-muted sm:col-span-4">
						{[endsNextDay(row) && m.task_shift_next_day(), locked && m.task_shift_locked_hint()]
							.filter(Boolean)
							.join(' ')}
					</p>
				{/if}
			</li>
		{/each}
	</ol>

	{#each f.shifts.issues() ?? [] as issue (issue.message)}
		<p role="alert" class="font-semibold text-danger">{errorMessage(issue.message)}</p>
	{/each}

	<!-- Adding rows needs JS; without it the form still edits the rows it has. -->
	<Button type="button" size="sm" variant="ghost" class="justify-self-start" onclick={addShift}>
		{m.task_shift_add()}
	</Button>
</fieldset>

<fieldset class="grid gap-5 sm:grid-cols-2">
	<legend class="mb-4 text-h3">{m.task_section_details()}</legend>

	<FormField label={m.task_place()} error={err(f.place)} optional>
		<Input {...f.place.as('text', initial.place)} />
	</FormField>

	<FormField label={m.task_contact()} error={err(f.contact)} optional>
		<Input {...f.contact.as('text', initial.contact)} />
	</FormField>

	<FormField label={m.task_bring()} error={err(f.bring)} optional>
		<Textarea {...f.bring.as('text', initial.bring)} rows={2} />
	</FormField>

	<FormField label={m.task_physical_demands()} error={err(f.physicalDemands)} optional>
		<Textarea {...f.physicalDemands.as('text', initial.physicalDemands)} rows={2} />
	</FormField>

	<Checkbox
		{...f.urgent.as('checkbox', initial.urgent)}
		label={m.task_urgent_label()}
		hint={m.task_urgent_hint()}
	/>
	<Checkbox
		{...f.selfService.as('checkbox', initial.selfService)}
		label={m.task_self_service()}
		hint={m.task_self_service_hint()}
	/>
</fieldset>

<WikiLinks fields={f} initial={initial.links} views={initial.linkViews} />
