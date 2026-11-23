<!--
	Create/edit form for a series: the same template as a task
	(TemplateFields), with the rule instead of a date.

	The rule's inputs all stay in the form; only the ones the chosen repeat
	mode needs are shown, and core only reads those. Showing and hiding
	needs JS: before hydration (or without JS) every input is visible, so
	the form still works, just less tidy.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { AdminSeries, CategoryGroup, SeriesRule } from '@commonsdb/core';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError as err } from '#lib/i18n/errors.ts';
	import { formatWhen, todayIso, weekdayName } from '#lib/format.ts';
	import { Button, FormField, Input, Select } from '#lib/ui';
	import TemplateFields from '../tasks/TemplateFields.svelte';
	import { templateInitial } from '../tasks/template.ts';
	import { saveSeries, seriesPreview, type SeriesRuleFormData } from './series.remote';

	type Props = {
		/** The series to edit; omit to create a new one. */
		series?: AdminSeries & { descriptionHtml: string };
		categories: CategoryGroup[];
		cancelHref: string;
	};

	let { series, categories, cancelHref }: Props = $props();

	const form = $derived(series ? saveSeries.for(series.id) : saveSeries);
	const f = $derived(form.fields);

	/** The stored rule as form values; defaults for a new series. */
	function ruleInitial(rule?: SeriesRule): Required<SeriesRuleFormData> {
		const today = todayIso();
		const todayWeekday = String((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7);
		const values = {
			repeat: rule?.repeat ?? 'weekly',
			whenKind: 'date',
			monthMode: 'nth',
			weekday: todayWeekday,
			fromWeekday: '0',
			toWeekday: '4',
			nth: '1',
			day: '1',
			fromDay: '1',
			toDay: '7',
			days: '7',
			anchor: series?.anchor ?? today,
			until: series?.until ?? '',
			minGapDays: String(series?.minGapDays ?? 0),
			lookahead: String(series?.lookahead ?? 3)
		};
		if (!rule) return values;
		if ('fromWeekday' in rule || 'fromDay' in rule || rule.repeat === 'every_n_days') {
			values.whenKind = 'range';
		}
		if ('day' in rule) values.monthMode = 'day';
		// copy the rule's own numbers over the defaults
		for (const [key, value] of Object.entries(rule)) {
			if (key !== 'repeat') (values as Record<string, string>)[key] = String(value);
		}
		return values;
	}

	const initial = $derived({
		...templateInitial(series, series?.shiftTemplates),
		...ruleInitial(series?.rule)
	});

	// ---- which rule inputs to show ------------------------------------------

	let hydrated = $state(false);
	onMount(() => (hydrated = true));

	const current = (key: keyof SeriesRuleFormData) => f[key].value() || initial[key];
	const repeat = $derived(current('repeat'));
	const periodic = $derived(['weekly', 'biweekly', 'monthly'].includes(repeat));
	const weeks = $derived(repeat === 'weekly' || repeat === 'biweekly');
	const range = $derived(periodic && current('whenKind') === 'range');
	const byDay = $derived(current('monthMode') === 'day');

	/** `hidden` for an input the current rule doesn't use (only once JS runs). */
	const unless = (shown: boolean) => hydrated && !shown;

	// ---- preview ------------------------------------------------------------

	const RULE_KEYS = [
		'repeat',
		'whenKind',
		'monthMode',
		'weekday',
		'fromWeekday',
		'toWeekday',
		'nth',
		'day',
		'fromDay',
		'toDay',
		'days',
		'anchor',
		'until',
		'minGapDays',
		'lookahead'
	] as const;

	const ruleValues = $derived(Object.fromEntries(RULE_KEYS.map((k) => [k, current(k)])));
	const preview = $derived(
		hydrated && repeat !== 'manual'
			? await seriesPreview({ seriesId: series?.id, rule: ruleValues })
			: []
	);

	// ---- options --------------------------------------------------------------

	const repeatOptions = [
		{ value: 'weekly', label: m.series_repeat_weekly() },
		{ value: 'biweekly', label: m.series_repeat_biweekly() },
		{ value: 'monthly', label: m.series_repeat_monthly() },
		{ value: 'every_n_days', label: m.series_repeat_every_n_days() },
		{ value: 'manual', label: m.series_repeat_manual() }
	];
	const weekdays = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
		value: String(d),
		label: weekdayName(d)
	}));
	const nthOptions = [
		m.series_nth_option_1,
		m.series_nth_option_2,
		m.series_nth_option_3,
		m.series_nth_option_4,
		m.series_nth_option_5
	].map((label, i) => ({ value: String(i + 1), label: label() }));
</script>

<!-- multipart: the photo is a file (remote forms don't add it on their own) -->
<form {...form} enctype="multipart/form-data" class="grid gap-8">
	{#if series}<input {...f.id.as('hidden', series.id)} />{/if}

	<TemplateFields
		fields={f}
		{initial}
		{categories}
		descriptionHtml={series?.descriptionHtml}
		imageSeed={series?.id}
	>
		{#snippet when()}
			<fieldset class="grid gap-5 sm:grid-cols-2">
				<legend class="mb-4 text-h3">{m.series_section_rule()}</legend>

				<FormField label={m.series_repeat()} error={err(f.repeat)} class="sm:col-span-2">
					<Select {...f.repeat.as('select', initial.repeat)} options={repeatOptions} />
				</FormField>

				<div
					class="grid gap-2 sm:col-span-2"
					role="radiogroup"
					aria-label={m.series_section_rule()}
					hidden={unless(periodic)}
				>
					{#each [['date', m.series_when_date()], ['range', m.series_when_range()]] as const as [kind, label] (kind)}
						<label class="flex cursor-pointer items-center gap-2.5">
							<input
								{...f.whenKind.as('radio', kind, initial.whenKind === kind)}
								class="size-4.5 accent-ink"
							/>
							{label}
						</label>
					{/each}
				</div>

				<div
					class="grid gap-2 sm:col-span-2"
					role="radiogroup"
					aria-label={m.series_repeat_monthly()}
					hidden={unless(repeat === 'monthly' && !range)}
				>
					{#each [['nth', m.series_month_mode_nth()], ['day', m.series_month_mode_day()]] as const as [mode, label] (mode)}
						<label class="flex cursor-pointer items-center gap-2.5">
							<input
								{...f.monthMode.as('radio', mode, initial.monthMode === mode)}
								class="size-4.5 accent-ink"
							/>
							{label}
						</label>
					{/each}
				</div>

				<div hidden={unless(repeat === 'monthly' && !range && !byDay)}>
					<FormField label={m.series_nth()} error={err(f.nth)}>
						<Select {...f.nth.as('select', initial.nth)} options={nthOptions} />
					</FormField>
				</div>

				<div hidden={unless((weeks && !range) || (repeat === 'monthly' && !range && !byDay))}>
					<FormField label={m.series_weekday()} error={err(f.weekday)}>
						<Select {...f.weekday.as('select', initial.weekday)} options={weekdays} />
					</FormField>
				</div>

				<div hidden={unless(weeks && range)}>
					<FormField label={m.series_from_weekday()} error={err(f.fromWeekday)}>
						<Select {...f.fromWeekday.as('select', initial.fromWeekday)} options={weekdays} />
					</FormField>
				</div>
				<div hidden={unless(weeks && range)}>
					<FormField label={m.series_to_weekday()} error={err(f.toWeekday)}>
						<Select {...f.toWeekday.as('select', initial.toWeekday)} options={weekdays} />
					</FormField>
				</div>

				<div hidden={unless(repeat === 'monthly' && !range && byDay)}>
					<FormField label={m.series_day()} hint={m.series_day_hint()} error={err(f.day)}>
						<Input {...f.day.as('text', initial.day)} inputmode="numeric" class="max-w-24" />
					</FormField>
				</div>

				<div hidden={unless(repeat === 'monthly' && range)}>
					<FormField label={m.series_from_day()} error={err(f.fromDay)}>
						<Input
							{...f.fromDay.as('text', initial.fromDay)}
							inputmode="numeric"
							class="max-w-24"
						/>
					</FormField>
				</div>
				<div hidden={unless(repeat === 'monthly' && range)}>
					<FormField label={m.series_to_day()} error={err(f.toDay)}>
						<Input {...f.toDay.as('text', initial.toDay)} inputmode="numeric" class="max-w-24" />
					</FormField>
				</div>

				<div class="sm:col-span-2" hidden={unless(repeat === 'every_n_days')}>
					<FormField label={m.series_days()} hint={m.series_days_hint()} error={err(f.days)}>
						<Input {...f.days.as('text', initial.days)} inputmode="numeric" class="max-w-24" />
					</FormField>
				</div>

				<FormField label={m.series_anchor()} hint={m.series_anchor_hint()} error={err(f.anchor)}>
					<Input {...f.anchor.as('date', initial.anchor)} required />
				</FormField>
				<FormField
					label={m.series_until()}
					hint={m.series_until_hint()}
					error={err(f.until)}
					optional
				>
					<Input {...f.until.as('date', initial.until)} />
				</FormField>

				<div hidden={unless(range)}>
					<FormField
						label={m.series_min_gap()}
						hint={m.series_min_gap_hint()}
						error={err(f.minGapDays)}
						optional
					>
						<Input
							{...f.minGapDays.as('text', initial.minGapDays)}
							inputmode="numeric"
							class="max-w-24"
						/>
					</FormField>
				</div>
				<div hidden={unless(periodic)}>
					<FormField
						label={m.series_lookahead()}
						hint={m.series_lookahead_hint()}
						error={err(f.lookahead)}
					>
						<Input
							{...f.lookahead.as('text', initial.lookahead)}
							inputmode="numeric"
							class="max-w-24"
						/>
					</FormField>
				</div>

				{#if hydrated}
					<p class="text-small sm:col-span-2" aria-live="polite">
						<span class="font-semibold">{m.series_preview()}:</span>
						{#if repeat === 'manual'}
							{m.series_preview_manual()}
						{:else if preview.length === 0}
							{m.series_preview_none()}
						{:else}
							{preview.map((p) => formatWhen(p)).join(' · ')}
						{/if}
					</p>
				{/if}
			</fieldset>
		{/snippet}
	</TemplateFields>

	{#each f.issues() ?? [] as issue (issue.message)}
		<p role="alert" class="font-semibold text-danger">{errorMessage(issue.message)}</p>
	{/each}

	<div class="flex flex-wrap gap-3">
		<Button type="submit" disabled={form.pending > 0}>
			{series ? m.admin_series_save() : m.admin_series_create()}
		</Button>
		<Button variant="ghost" href={cancelHref}>{m.ui_cancel()}</Button>
	</div>
</form>
