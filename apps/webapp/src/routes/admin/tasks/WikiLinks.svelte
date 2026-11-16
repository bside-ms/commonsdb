<!--
	Wiki pages linked to a task or series. The chosen pages are hidden
	inputs links[i] (like the shift rows, they live in the form's own
	state); the search above them only adds to that list.

	Without JS the stored links are posted unchanged; searching and adding
	needs JS.
-->
<script lang="ts">
	import { X } from '@lucide/svelte';
	import type { RemoteFormFields } from '$app/server';
	import type { LinkView } from '@commonsdb/core';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { Button, FormField, Input } from '#lib/ui';
	import { wikiLinkSearch } from './tasks.remote';
	import type { TemplateFormData } from './template.ts';

	const MAX = 10;

	type Props = {
		fields: RemoteFormFields<TemplateFormData>;
		initial: string[];
		views: LinkView[];
	};

	let { fields: f, initial, views }: Props = $props();

	/** Added or removed: from then on the form state holds the whole list. */
	let touched = $state(false);
	const keys: string[] = $derived(
		(touched ? (f.links.value() ?? []) : (f.links.value() ?? initial)).filter((k): k is string =>
			Boolean(k)
		)
	);

	/** Titles of stored links and of the ones added here. */
	let added = $state<Record<string, LinkView>>({});
	const viewOf = (key: string): LinkView =>
		added[key] ?? views.find((v) => v.key === key) ?? { key, title: key, available: true };

	let term = $state('');
	let debounced = $state('');
	$effect(() => {
		const value = term;
		const timer = setTimeout(() => (debounced = value), 250);
		return () => clearTimeout(timer);
	});
	const hits = $derived(
		(debounced.trim().length >= 2 ? await wikiLinkSearch(debounced) : []).filter(
			(h) => !keys.includes(h.key)
		)
	);

	function add(hit: { key: string; title: string }) {
		touched = true;
		added[hit.key] = { key: hit.key, title: hit.title, available: true };
		f.links.set([...keys, hit.key]);
		term = '';
	}

	function remove(key: string) {
		touched = true;
		f.links.set(keys.filter((k) => k !== key));
	}
</script>

<fieldset class="grid gap-4">
	<legend class="mb-4 text-h3">{m.task_section_wiki()}</legend>
	<p class="text-small text-muted">{m.task_wiki_hint()}</p>

	{#if keys.length > 0}
		<ul class="grid gap-2" aria-label={m.task_wiki_linked()}>
			{#each keys as key, i (key)}
				{@const view = viewOf(key)}
				<li class="flex items-center justify-between gap-3 border border-ink px-3 py-2">
					<input {...f.links[i].as('hidden', key)} />
					<span>
						<span class="font-semibold">{view.title}</span>
						{#if !view.available}
							<span class="text-small text-muted"> · {m.wiki_link_unavailable()}</span>
						{/if}
					</span>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						tone="danger"
						aria-label={m.task_wiki_remove({ title: view.title })}
						onclick={() => remove(key)}
					>
						<X class="size-4" strokeWidth={2} aria-hidden="true" />
					</Button>
				</li>
			{/each}
		</ul>
	{/if}

	{#each f.links.issues() ?? [] as issue (issue.message)}
		<p role="alert" class="font-semibold text-danger">{errorMessage(issue.message)}</p>
	{/each}

	{#if keys.length < MAX}
		<FormField label={m.task_wiki_search()} optional>
			<!-- no name: the search term is never posted; Enter must not submit -->
			<Input
				type="search"
				bind:value={term}
				placeholder={m.wiki_search_placeholder()}
				autocomplete="off"
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter') e.preventDefault();
				}}
			/>
		</FormField>
		{#if debounced.trim().length >= 2}
			{#if hits.length === 0}
				<p class="text-small text-muted">{m.wiki_search_none({ q: debounced })}</p>
			{:else}
				<ul class="grid gap-1" aria-label={m.wiki_search_results()}>
					{#each hits as hit (hit.key)}
						<li class="flex items-start justify-between gap-3 border-b border-hair py-1.5">
							<span>
								<span class="block font-semibold">{hit.title}</span>
								{#if hit.snippet}
									<span class="block text-small text-muted">…{hit.snippet}…</span>
								{/if}
							</span>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								aria-label={m.task_wiki_add({ title: hit.title })}
								onclick={() => add(hit)}
							>
								{m.task_wiki_add_short()}
							</Button>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	{/if}
</fieldset>
