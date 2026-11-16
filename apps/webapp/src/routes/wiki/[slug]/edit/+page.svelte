<!--
	Editing (admins): title and content as a new revision. The form
	carries the revision it started from; if someone saved in between,
	core refuses with wiki_page_conflict and the text stays in the editor.
	Below: where the page sits (move).
-->
<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { WIKI_MAX_DEPTH } from '@commonsdb/core';
	import { isAllowedHref, profiles } from '@commonsdb/richtext';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError } from '#lib/i18n/errors.ts';
	import { Button, Card, Editor, FormField, Input, Select } from '#lib/ui';
	import { move, save, tree, wikiPage } from '../../wiki.remote';
	import { nest, parentOptions, type TreeNode } from '../../tree.ts';

	const slug = $derived(page.params.slug!);
	const [p, pages] = $derived(await Promise.all([wikiPage(slug), tree()]));
	const f = save.fields;
	// the version the editor started from, fixed: queries refresh after a
	// failed save, but the conflict check must keep the original base
	const base = untrack(() => p.revisionId);
	const moveForm = $derived(move.for(p.slug));

	/** Levels this page takes up with its subpages (1 = no subpages). */
	const height = $derived.by(() => {
		const find = (nodes: TreeNode[]): TreeNode | undefined =>
			nodes.map((n) => (n.id === p.id ? n : find(n.children))).find(Boolean);
		const h = (n: TreeNode): number => 1 + Math.max(0, ...n.children.map(h));
		const node = find(nest(pages));
		return node ? h(node) : 1;
	});
	const options = $derived(
		parentOptions(pages, { maxDepth: WIKI_MAX_DEPTH, exclude: p.id, levels: height })
	);
	const currentParent = $derived(pages.find((x) => x.id === p.id)?.parentId ?? '');
	const conflict = $derived(f.issues()?.some((i) => i.message === 'wiki_page_conflict'));
</script>

<svelte:head><title>{m.wiki_edit()}: {p.title} · {m.app_name()}</title></svelte:head>

<a
	href={resolve('/wiki/[slug]', { slug: p.slug })}
	class="inline-flex items-center gap-1.5 text-small font-semibold"
>
	<ArrowLeft class="size-4" strokeWidth={2} aria-hidden="true" />
	{p.title}
</a>
<h1 class="mt-4">{m.wiki_edit()}</h1>

<form {...save} class="mt-6 grid max-w-3xl gap-6">
	<input {...f.slug.as('hidden', p.slug)} />
	<input {...f.baseRevisionId.as('hidden', base)} />
	<FormField label={m.wiki_page_title()} error={fieldError(f.title)}>
		<Input {...f.title.as('text', p.title)} maxlength={200} required />
	</FormField>
	<FormField label={m.wiki_content()} optional error={fieldError(f.content)}>
		<Editor
			name={f.content.as('hidden', '').name}
			value={p.content}
			html={p.html}
			extensions={profiles.wiki()}
			{isAllowedHref}
		/>
	</FormField>

	{#if conflict}
		<div role="alert" class="border-l-4 border-danger pl-3">
			<p class="font-semibold">{errorMessage('wiki_page_conflict')}</p>
			<p class="mt-1 text-small">
				{m.wiki_conflict_hint()}
				<a href={resolve('/wiki/[slug]', { slug: p.slug })} target="_blank"
					>{m.wiki_conflict_open()}</a
				>
			</p>
		</div>
	{:else}
		{#each f.issues() ?? [] as issue (issue.message)}
			<p role="alert" class="font-semibold text-danger">{errorMessage(issue.message)}</p>
		{/each}
	{/if}

	<div class="flex flex-wrap gap-3">
		<Button type="submit" disabled={save.pending > 0}>{m.wiki_save()}</Button>
		<Button variant="ghost" href={resolve('/wiki/[slug]', { slug: p.slug })}>{m.ui_cancel()}</Button
		>
	</div>
</form>

<Card class="mt-10 max-w-3xl" title={m.wiki_move_title()}>
	<form {...moveForm} class="grid gap-4">
		<input {...moveForm.fields.slug.as('hidden', p.slug)} />
		<FormField
			label={m.wiki_parent()}
			hint={m.wiki_move_hint()}
			optional
			error={fieldError(moveForm.fields.parentId)}
		>
			<Select
				{...moveForm.fields.parentId.as('select', currentParent)}
				{options}
				placeholder={m.wiki_parent_none()}
			/>
		</FormField>
		<div><Button type="submit" variant="ghost">{m.wiki_move()}</Button></div>
	</form>
</Card>
