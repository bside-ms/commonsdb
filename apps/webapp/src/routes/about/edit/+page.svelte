<!--
	Edit the "About" page (superadmins). Same editor and profile as the
	wiki: headings, lists, quotes, links. Saving an empty editor empties
	the page.
-->
<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { isAllowedHref, profiles } from '@commonsdb/richtext';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError } from '#lib/i18n/errors.ts';
	import { Button, Editor, FormField } from '#lib/ui';
	import { aboutForEdit, saveAbout } from '../about.remote';

	const page = $derived(await aboutForEdit());
	const f = saveAbout.fields;
</script>

<svelte:head><title>{m.about_edit()} · {m.app_name()}</title></svelte:head>

<a href={resolve('/about')} class="inline-flex items-center gap-1.5 text-small font-semibold">
	<ArrowLeft class="size-4" strokeWidth={2} aria-hidden="true" />
	{m.about_title()}
</a>
<h1 class="mt-4">{m.about_edit()}</h1>

<form {...saveAbout} class="mt-6 grid max-w-3xl gap-6">
	<FormField label={m.about_content()} optional error={fieldError(f.content)}>
		<Editor
			name={f.content.as('hidden', '').name}
			value={page.content}
			html={page.html}
			extensions={profiles.wiki()}
			{isAllowedHref}
		/>
	</FormField>

	{#each f.issues() ?? [] as issue (issue.message)}
		<p role="alert" class="font-semibold text-danger">{errorMessage(issue.message)}</p>
	{/each}

	<div class="flex flex-wrap gap-3">
		<Button type="submit" disabled={saveAbout.pending > 0}>{m.about_save()}</Button>
		<Button variant="ghost" href={resolve('/about')}>{m.ui_cancel()}</Button>
	</div>
</form>
