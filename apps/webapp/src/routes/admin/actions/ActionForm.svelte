<!--
	Create/edit form for an Aktion, used by /admin/actions/new and
	/admin/actions/[id]. New ones start as drafts, so tasks can be
	marked before members see it.
-->
<script lang="ts">
	import type { ActionItem } from '@commonsdb/core';
	import { isAllowedHref, profiles } from '@commonsdb/richtext';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError as err } from '#lib/i18n/errors.ts';
	import { Button, Checkbox, Editor, FormField, Input } from '#lib/ui';
	import { saveAction } from './actions.remote';

	type Props = {
		/** The Aktion to edit; omit to create one. */
		item?: ActionItem & { html: string };
		/** Everyone who can be a lead. */
		people: { id: string; name: string }[];
		cancelHref: string;
	};

	let { item, people, cancelHref }: Props = $props();

	const form = $derived(item ? saveAction.for(item.id) : saveAction);
	const f = $derived(form.fields);
	const leadIds = $derived(item?.leads.map((l) => l.id) ?? []);
</script>

<form {...form} class="grid gap-6">
	{#if item}<input {...f.id.as('hidden', item.id)} />{/if}

	<FormField label={m.admin_actions_field_title()} error={err(f.title)}>
		<Input
			{...f.title.as('text', item?.title ?? '')}
			placeholder={m.admin_actions_field_title_placeholder()}
			maxlength={200}
			required
		/>
	</FormField>

	<div class="grid gap-4 sm:grid-cols-[auto_auto_auto] sm:justify-start">
		<FormField label={m.admin_actions_field_date()} error={err(f.date)}>
			<Input {...f.date.as('date', item?.date ?? '')} required />
		</FormField>
		<FormField label={m.admin_actions_field_from()} optional error={err(f.startsTime)}>
			<Input {...f.startsTime.as('time', item?.startsTime ?? '')} />
		</FormField>
		<FormField
			label={m.admin_actions_field_to()}
			hint={m.admin_actions_field_time_hint()}
			optional
			error={err(f.endsTime)}
		>
			<Input {...f.endsTime.as('time', item?.endsTime ?? '')} />
		</FormField>
	</div>

	<FormField label={m.admin_actions_field_place()} optional error={err(f.place)}>
		<Input {...f.place.as('text', item?.place ?? '')} maxlength={200} />
	</FormField>

	<FormField label={m.admin_actions_field_description()} optional error={err(f.description)}>
		<Editor
			name={f.description.as('hidden', '').name}
			value={item?.description ?? null}
			html={item?.html}
			extensions={profiles.description()}
			{isAllowedHref}
		/>
	</FormField>

	<fieldset class="grid gap-2">
		<legend class="font-semibold">{m.admin_actions_field_leads()}</legend>
		<p class="text-small text-muted">{m.admin_actions_field_leads_hint()}</p>
		<div
			class="mt-1 grid max-h-64 gap-2 overflow-y-auto border border-hair p-3 sm:grid-cols-2 lg:grid-cols-3"
		>
			{#each people as p (p.id)}
				<Checkbox {...f.leadIds.as('checkbox', p.id, leadIds.includes(p.id))} label={p.name} />
			{/each}
		</div>
		{#if err(f.leadIds)}
			<p role="alert" class="text-small font-semibold text-danger">{err(f.leadIds)}</p>
		{/if}
	</fieldset>

	<Checkbox
		{...f.published.as('checkbox', item ? item.publishedAt !== null : false)}
		label={m.admin_actions_field_published()}
		hint={m.admin_actions_field_published_hint()}
	/>

	{#each f.issues() ?? [] as issue (issue.message)}
		<p role="alert" class="font-semibold text-danger">{errorMessage(issue.message)}</p>
	{/each}

	<div class="flex flex-wrap gap-3">
		<Button type="submit" disabled={form.pending > 0}>{m.admin_actions_save()}</Button>
		<Button variant="ghost" href={cancelHref}>{m.ui_cancel()}</Button>
	</div>
</form>
