<!--
	All versions of a page, newest first. ?rev=<id> shows one of them;
	admins can bring it back (as a new version, nothing is lost).
-->
<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatStamp } from '#lib/format.ts';
	import { Badge, Button, Card, RichText } from '#lib/ui';
	import { restoreRevision, revision, revisions, wikiPage } from '../../wiki.remote';

	const slug = $derived(page.params.slug!);
	const rev = $derived(page.url.searchParams.get('rev'));
	const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const [p, list, shown] = $derived(
		await Promise.all([
			wikiPage(slug),
			revisions(slug),
			rev && UUID.test(rev) ? revision({ slug, id: rev }) : null
		])
	);
	const restoreForm = $derived(restoreRevision.for(shown?.id ?? ''));
</script>

<svelte:head><title>{m.wiki_history()}: {p.title} · {m.app_name()}</title></svelte:head>

<a
	href={resolve('/wiki/[slug]', { slug })}
	class="inline-flex items-center gap-1.5 text-small font-semibold"
>
	<ArrowLeft class="size-4" strokeWidth={2} aria-hidden="true" />
	{p.title}
</a>
<h1 class="mt-4">{m.wiki_history()}</h1>

<div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
	<ol class="grid content-start gap-1" aria-label={m.wiki_versions()}>
		{#each list as r (r.id)}
			<li>
				<!-- eslint-disable svelte/no-navigation-without-resolve -- resolved, plus ?rev -->
				<a
					href={`${resolve('/wiki/[slug]/history', { slug })}?rev=${r.id}`}
					aria-current={shown?.id === r.id ? 'true' : undefined}
					class={[
						'block border px-3 py-2 no-underline',
						shown?.id === r.id ? 'border-ink bg-area-start' : 'border-transparent hover:bg-hover'
					]}
				>
					<span class="block font-semibold">{formatStamp(r.createdAt)}</span>
					<span class="block text-small text-muted">
						{r.author ?? m.messages_someone()} · {r.title}
					</span>
					{#if r.current}<Badge outline class="mt-1">{m.wiki_version_current()}</Badge>{/if}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</li>
		{/each}
	</ol>

	{#if shown}
		<Card>
			<h2 class="text-h3">{shown.title}</h2>
			<p class="mt-1 text-small text-muted">
				{m.wiki_version_of({ when: formatStamp(shown.createdAt), name: shown.author ?? '–' })}
			</p>
			{#if p.canEdit && !shown.current}
				<form {...restoreForm} class="mt-3">
					<input {...restoreForm.fields.slug.as('hidden', slug)} />
					<input {...restoreForm.fields.revisionId.as('hidden', shown.id)} />
					<Button type="submit" size="sm">{m.wiki_version_restore()}</Button>
				</form>
			{/if}
			<RichText html={shown.html} class="mt-4" />
		</Card>
	{:else}
		<p class="text-muted">{m.wiki_version_pick()}</p>
	{/if}
</div>
