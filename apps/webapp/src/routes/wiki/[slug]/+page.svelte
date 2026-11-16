<!--
	Reading a page: breadcrumbs, title, content, subpages, who changed it
	last. Admins also get edit, new subpage (if not too deep), history,
	Markdown download and delete (asks first; only pages without subpages).
-->
<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { WIKI_MAX_DEPTH } from '@commonsdb/core';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { formatStamp } from '#lib/format.ts';
	import { Button, Modal, RichText } from '#lib/ui';
	import { remove, wikiPage } from '../wiki.remote';

	const p = $derived(await wikiPage(page.params.slug!));
	const removeForm = $derived(remove.for(p.slug));
	let deleteOpen = $state(false);
	const deleteFormId = $props.id();
</script>

<svelte:head><title>{p.title} · {m.wiki_title()} · {m.app_name()}</title></svelte:head>

<nav aria-label={m.wiki_breadcrumbs()} class="text-small">
	<ol class="flex flex-wrap gap-1.5">
		<li><a href={resolve('/wiki')}>{m.wiki_title()}</a></li>
		{#each p.breadcrumbs as b (b.slug)}
			<li aria-hidden="true">›</li>
			<li><a href={resolve('/wiki/[slug]', { slug: b.slug })}>{b.title}</a></li>
		{/each}
	</ol>
</nav>

<article class="mt-4 max-w-3xl">
	<h1>{p.title}</h1>
	<p class="mt-2 text-small text-muted">
		{p.updatedBy
			? m.wiki_updated_by({ name: p.updatedBy, when: formatStamp(p.updatedAt) })
			: m.wiki_updated({ when: formatStamp(p.updatedAt) })}
		·
		<a href={resolve('/wiki/[slug]/history', { slug: p.slug })}>{m.wiki_history()}</a>
	</p>

	{#if p.canEdit}
		<div class="mt-4 flex flex-wrap gap-2">
			<Button size="sm" href={resolve('/wiki/[slug]/edit', { slug: p.slug })}
				>{m.wiki_edit()}</Button
			>
			{#if p.depth < WIKI_MAX_DEPTH}
				<Button size="sm" variant="ghost" href={`${resolve('/wiki/new')}?parent=${p.id}`}>
					{m.wiki_new_child()}
				</Button>
			{/if}
			<Button
				size="sm"
				variant="ghost"
				href={resolve('/wiki/[slug]/markdown', { slug: p.slug })}
				data-sveltekit-reload
			>
				{m.wiki_download()}
			</Button>
			{#if p.children.length === 0}
				<form
					id={deleteFormId}
					{...removeForm.enhance(async ({ submit }) => {
						deleteOpen = false;
						await submit();
					})}
				>
					<input {...removeForm.fields.slug.as('hidden', p.slug)} />
					<Button
						type="submit"
						size="sm"
						variant="ghost"
						tone="danger"
						onclick={(e) => {
							e.preventDefault();
							deleteOpen = true;
						}}
					>
						{m.wiki_delete()}
					</Button>
				</form>
			{/if}
		</div>
		{#each removeForm.fields.issues() ?? [] as issue (issue.message)}
			<p role="alert" class="mt-2 text-small font-semibold text-danger">
				{errorMessage(issue.message)}
			</p>
		{/each}
	{/if}

	<RichText html={p.html} class="mt-6" />

	{#if p.children.length}
		<section class="mt-10 border-t border-ink pt-4" aria-labelledby="wiki-children">
			<h2 id="wiki-children" class="text-h3">{m.wiki_children()}</h2>
			<ul class="mt-2 grid gap-1">
				{#each p.children as c (c.slug)}
					<li><a href={resolve('/wiki/[slug]', { slug: c.slug })}>{c.title}</a></li>
				{/each}
			</ul>
		</section>
	{/if}
</article>

<Modal
	bind:open={deleteOpen}
	title={m.wiki_delete_title({ title: p.title })}
	description={m.wiki_delete_text()}
>
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (deleteOpen = false)}>{m.ui_cancel()}</Button>
		<Button type="submit" form={deleteFormId} tone="danger">{m.wiki_delete()}</Button>
	{/snippet}
</Modal>
