<!--
	Create/edit form for a task. Lives next to its routes, not in lib/ui:
	it's domain UI, used by /admin/tasks/new and /admin/tasks/[id].

	Every input comes from `form.fields.<name>.as(...)`. That gives it a
	name SvelteKit recognises (unknown fields are rejected), the initial
	value, and aria-invalid. Issues come back per field as codes from core.
-->
<script lang="ts">
	import type { AdminTask, CategoryGroup } from '@commonsdb/core';
	import { isAllowedHref, profiles } from '@commonsdb/richtext';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { hoursValue } from '#lib/format.ts';
	import { Button, Checkbox, Editor, FormField, Input, Select, Textarea } from '#lib/ui';
	import ShiftStatusBadge from './ShiftStatusBadge.svelte';
	import { saveTask, type ShiftFormData } from './tasks.remote';

	type Props = {
		/** The task to edit; omit to create a new one. */
		task?: AdminTask & { descriptionHtml: string };
		categories: CategoryGroup[];
		cancelHref: string;
	};

	let { task, categories, cancelHref }: Props = $props();

	// Editing: one form instance per task (`for` is keyed by the id, and
	// also posts it). Creating: the plain form, so no id is sent.
	const form = $derived(task ? saveTask.for(task.id) : saveTask);
	const f = $derived(form.fields);

	/** Initial values: the stored task, or sensible defaults for a new one. */
	const initial = $derived({
		title: task?.title ?? '',
		categoryId: task?.categoryId ?? '',
		description: task?.description ? JSON.stringify(task.description) : '',
		urgent: task?.urgent ?? false,
		selfService: task?.selfService ?? false,
		place: task?.place ?? '',
		contact: task?.contact ?? '',
		bring: task?.bring ?? '',
		physicalDemands: task?.physicalDemands ?? '',
		whenKind: task?.whenKind ?? 'date',
		startsOn: task?.startsOn ?? '',
		endsOn: task?.endsOn ?? ''
	});

	// ---- shifts -------------------------------------------------------------
	//
	// The rows live in the form's own state (f.shifts.value()/set()), not in a
	// separate $state: then a failed submit (with or without JS) comes back
	// with exactly the rows that were posted, and indices always match names.

	const EMPTY_SHIFT: ShiftFormData = { id: '', startsTime: '', endsTime: '', hours: '' };

	const initialShifts: ShiftFormData[] = $derived(
		task
			? task.shifts.map((s) => ({
					id: s.id,
					startsTime: s.startsTime ?? '',
					endsTime: s.endsTime ?? '',
					hours: hoursValue(s.hoursTenths)
				}))
			: [EMPTY_SHIFT]
	);

	/** Rows were added or removed: from then on the form state holds all of them. */
	let reshaped = $state(false);

	const rows: ShiftFormData[] = $derived.by(() => {
		const posted = (f.shifts.value() ?? []) as Partial<ShiftFormData>[];
		const length = reshaped ? posted.length : Math.max(posted.length, initialShifts.length);
		// before any add/remove, typed values only cover the fields touched so far
		return Array.from({ length }, (_, i) => ({
			...EMPTY_SHIFT,
			...(reshaped ? {} : initialShifts[i]),
			...posted[i]
		}));
	});

	/** Stored shifts by id: status and holder for rows that already exist. */
	const stored = $derived(new Map(task?.shifts.map((s) => [s.id, s]) ?? []));

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

	/** First issue of a field, translated. */
	const err = (field: { issues(): { message: string }[] | undefined }) => {
		const issue = field.issues()?.[0];
		return issue ? errorMessage(issue.message) : undefined;
	};

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
</script>

<form {...form} class="grid gap-8">
	{#if task}<input {...f.id.as('hidden', task.id)} />{/if}

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
				html={task?.descriptionHtml}
				extensions={profiles.description()}
				{isAllowedHref}
			/>
		</FormField>
	</fieldset>

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

	<fieldset class="grid gap-4">
		<legend class="mb-4 text-h3">{m.task_section_shifts()}</legend>
		<p class="text-small text-muted">{m.task_shifts_hint()}</p>

		<ol class="grid gap-3">
			{#each rows as row, i (i)}
				{@const field = f.shifts[i]}
				{@const held = row.id ? stored.get(row.id) : undefined}
				{@const locked = held !== undefined && held.status !== 'open'}
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
							readonly={held?.status === 'confirmed'}
						/>
					</FormField>
					<div class="flex min-h-11 items-center">
						{#if locked}
							<ShiftStatusBadge shift={held} />
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
