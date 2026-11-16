<!--
	The wiki: search on top (?q, a GET form, works without JS), the page
	tree below. Admins get "Neue Seite" and the bin.
-->
<script lang="ts">
	import { BookOpen, Plus } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { Button, Card, EmptyState, FormField, Input } from '#lib/ui';
	import { search, tree } from './wiki.remote';
	import { nest, type TreeNode } from './tree.ts';

	const q = $derived(page.url.searchParams.get('q') ?? '');
	const isAdmin = $derived(Boolean(page.data.user?.isAdmin));
	const [pages, hits] = $derived(await Promise.all([tree(), q.trim() ? search(q) : []]));
	const nodes = $derived(nest(pages));

	/** «Treffer» from Postgres → <mark>; everything else stays text. */
	const parts = (snippet: string) =>
		snippet
			.split(/(«[^»]*»)/)
			.map((s) => ({ hit: s.startsWith('«'), text: s.replace(/[«»]/g, '') }));
</script>

<svelte:head><title>{m.wiki_title()} · {m.app_name()}</title></svelte:head>

{#snippet branch(list: TreeNode[])}
	<ul class={list[0]?.depth > 1 ? 'mt-1 ml-5 border-l border-hair pl-3' : 'grid gap-1'}>
		{#each list as n (n.id)}
			<li class="py-0.5">
				<a
					href={resolve('/wiki/[slug]', { slug: n.slug })}
					class={n.depth === 1 ? 'font-semibold' : ''}
				>
					{n.title}
				</a>
				{#if n.children.length}{@render branch(n.children)}{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<div class="flex flex-wrap items-end justify-between gap-4">
	<h1>{m.wiki_title()}</h1>
	{#if isAdmin}
		<div class="flex flex-wrap gap-2">
			<Button href={resolve('/wiki/new')}>
				<Plus class="size-4.5" strokeWidth={2} aria-hidden="true" />
				{m.wiki_new()}
			</Button>
			<Button variant="ghost" href={resolve('/wiki/trash')}>{m.wiki_trash()}</Button>
		</div>
	{/if}
</div>
<p class="mt-3 max-w-prose text-small text-muted">{m.wiki_intro()}</p>

<form
	method="get"
	data-sveltekit-reset="false"
	class="mt-6 flex max-w-2xl flex-wrap items-end gap-3"
>
	<FormField label={m.wiki_search()} class="min-w-48 flex-1">
		<Input type="search" name="q" value={q} placeholder={m.wiki_search_placeholder()} />
	</FormField>
	<Button type="submit" variant="ghost">{m.wiki_search_submit()}</Button>
</form>

{#if q.trim()}
	<section class="mt-6 max-w-3xl" aria-label={m.wiki_search_results()}>
		{#if hits.length === 0}
			<p class="text-muted">{m.wiki_search_none({ q })}</p>
		{:else}
			<ul class="grid gap-4">
				{#each hits as hit (hit.id)}
					<li>
						<a href={resolve('/wiki/[slug]', { slug: hit.slug })} class="font-semibold"
							>{hit.title}</a
						>
						{#if hit.snippet}
							<p class="mt-0.5 text-small text-muted">
								…{#each parts(hit.snippet) as part, i (i)}{#if part.hit}<mark
											class="bg-accent text-ink">{part.text}</mark
										>{:else}{part.text}{/if}{/each}…
							</p>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
		<p class="mt-4 text-small"><a href={resolve('/wiki')}>{m.wiki_search_reset()}</a></p>
	</section>
{:else if nodes.length === 0}
	<EmptyState
		class="mt-6"
		icon={BookOpen}
		title={m.wiki_empty_title()}
		description={isAdmin ? m.wiki_empty_hint_admin() : m.wiki_empty_hint()}
	/>
{:else}
	<Card class="mt-6 max-w-3xl">
		<nav aria-label={m.wiki_tree()}>{@render branch(nodes)}</nav>
	</Card>
{/if}
