<!--
	About the space. The text lives in the database (site_page 'about'),
	so the space can change it without a release; superadmins get an edit
	button. Until someone writes it, members see a short empty state.
-->
<script lang="ts">
	import { Info, Pencil } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate } from '#lib/format.ts';
	import { Button, EmptyState, RichText } from '#lib/ui';
	import { aboutPage } from './about.remote';

	const page = $derived(await aboutPage());
</script>

<svelte:head><title>{m.about_title()} · {m.app_name()}</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<h1>{m.about_title()}</h1>
	{#if page.canEdit}
		<Button size="sm" variant="ghost" href={resolve('/about/edit')}>
			<Pencil class="size-4" strokeWidth={2} aria-hidden="true" />
			{m.about_edit()}
		</Button>
	{/if}
</div>

{#if page.html}
	<RichText html={page.html} class="mt-6 max-w-prose" />
	{#if page.updatedAt}
		<p class="mt-8 text-small text-muted">
			{m.about_updated({ date: formatDate(page.updatedAt) })}
		</p>
	{/if}
{:else}
	<EmptyState
		class="mt-6"
		icon={Info}
		title={m.about_empty_title()}
		description={page.canEdit ? m.about_empty_hint_editor() : m.about_empty_hint()}
	/>
{/if}
