<!--
	Deleted pages (admins). Restoring puts a page back where it was, or on
	top level if its parent is gone.
-->
<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatStamp } from '#lib/format.ts';
	import { Button, Card, EmptyState } from '#lib/ui';
	import { restorePage, trash } from '../wiki.remote';

	const pages = $derived(await trash());
</script>

<svelte:head><title>{m.wiki_trash()} · {m.app_name()}</title></svelte:head>

<a href={resolve('/wiki')} class="inline-flex items-center gap-1.5 text-small font-semibold">
	<ArrowLeft class="size-4" strokeWidth={2} aria-hidden="true" />
	{m.wiki_title()}
</a>
<h1 class="mt-4">{m.wiki_trash()}</h1>

{#if pages.length === 0}
	<EmptyState class="mt-6" title={m.wiki_trash_empty()} />
{:else}
	<Card class="mt-6 max-w-3xl" padded={false}>
		<ul class="divide-y divide-hair">
			{#each pages as p (p.id)}
				{@const f = restorePage.for(p.id)}
				<li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
					<span>
						<span class="block font-semibold">{p.title}</span>
						{#if p.deletedAt}
							<span class="text-small text-muted">
								{m.wiki_deleted_at({ when: formatStamp(p.deletedAt) })}
							</span>
						{/if}
					</span>
					<form {...f}>
						<input {...f.fields.id.as('hidden', p.id)} />
						<Button type="submit" size="sm" variant="ghost">{m.wiki_restore()}</Button>
					</form>
				</li>
			{/each}
		</ul>
	</Card>
{/if}
