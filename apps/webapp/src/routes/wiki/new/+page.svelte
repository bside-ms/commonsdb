<!--
	New page (admins). ?parent=<id> preselects where it goes.
-->
<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { WIKI_MAX_DEPTH } from '@commonsdb/core';
	import { isAllowedHref, profiles } from '@commonsdb/richtext';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError } from '#lib/i18n/errors.ts';
	import { Button, Editor, FormField, Input, Select } from '#lib/ui';
	import { create, tree } from '../wiki.remote';
	import { parentOptions } from '../tree.ts';

	const pages = $derived(await tree());
	const options = $derived(parentOptions(pages, { maxDepth: WIKI_MAX_DEPTH }));
	const parent = $derived(page.url.searchParams.get('parent') ?? '');
	const f = create.fields;
</script>

<svelte:head><title>{m.wiki_new()} · {m.app_name()}</title></svelte:head>

<a href={resolve('/wiki')} class="inline-flex items-center gap-1.5 text-small font-semibold">
	<ArrowLeft class="size-4" strokeWidth={2} aria-hidden="true" />
	{m.wiki_title()}
</a>
<h1 class="mt-4">{m.wiki_new()}</h1>

<form {...create} class="mt-6 grid max-w-3xl gap-6">
	<FormField label={m.wiki_page_title()} error={fieldError(f.title)}>
		<Input {...f.title.as('text')} maxlength={200} required />
	</FormField>
	<FormField
		label={m.wiki_parent()}
		hint={m.wiki_parent_hint()}
		optional
		error={fieldError(f.parentId)}
	>
		<Select
			{...f.parentId.as('select', options.some((o) => o.value === parent) ? parent : '')}
			{options}
			placeholder={m.wiki_parent_none()}
		/>
	</FormField>
	<FormField label={m.wiki_content()} optional error={fieldError(f.content)}>
		<Editor name={f.content.as('hidden', '').name} extensions={profiles.wiki()} {isAllowedHref} />
	</FormField>

	{#each f.issues() ?? [] as issue (issue.message)}
		<p role="alert" class="font-semibold text-danger">{errorMessage(issue.message)}</p>
	{/each}

	<div class="flex flex-wrap gap-3">
		<Button type="submit" disabled={create.pending > 0}>{m.wiki_create()}</Button>
		<Button variant="ghost" href={resolve('/wiki')}>{m.ui_cancel()}</Button>
	</div>
</form>
