<!--
	Suggestion queue. Open ones oldest first (nobody waits forever),
	handled ones newest first. The tab lives in the URL (?status), so it
	works without JS and survives reloads. Rows link to the detail page,
	where converting and declining happen.
-->
<script lang="ts">
	import { Lightbulb } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { SuggestionStatus } from '@commonsdb/core';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate } from '#lib/format.ts';
	import { mediaUrl } from '#lib/media.ts';
	import { Badge, Chip, EmptyState, Thumb } from '#lib/ui';
	import { adminSuggestions } from './suggestions.remote';

	const STATUSES = ['open', 'converted', 'rejected'] as const satisfies SuggestionStatus[];

	const status = $derived.by((): SuggestionStatus => {
		const s = page.url.searchParams.get('status');
		return STATUSES.find((x) => x === s) ?? 'open';
	});

	const items = $derived(await adminSuggestions({ status }));

	const tabLabel = {
		open: m.admin_suggestions_view_open,
		converted: m.admin_suggestions_view_converted,
		rejected: m.admin_suggestions_view_rejected
	};
	const emptyTitle = {
		open: m.admin_suggestions_empty_open,
		converted: m.admin_suggestions_empty_converted,
		rejected: m.admin_suggestions_empty_rejected
	};
	const tabHref = (s: SuggestionStatus) =>
		s === 'open' ? resolve('/admin/suggestions') : `?status=${s}`;
</script>

<svelte:head><title>{m.admin_suggestions_title()} · {m.app_name()}</title></svelte:head>

<h1>{m.admin_suggestions_title()}</h1>
<p class="mt-1 text-small text-muted">{m.admin_suggestions_intro()}</p>

<nav class="mt-6 flex flex-wrap gap-2" aria-label={m.admin_suggestions_views()}>
	{#each STATUSES as s (s)}
		<Chip href={tabHref(s)} pressed={status === s}>{tabLabel[s]()}</Chip>
	{/each}
</nav>

{#if items.length === 0}
	<EmptyState
		class="mt-6"
		icon={Lightbulb}
		title={emptyTitle[status]()}
		description={status === 'open' ? m.admin_suggestions_empty_open_hint() : undefined}
	/>
{:else}
	<ul class="mt-6 divide-y divide-ink border border-ink bg-paper">
		{#each items as s (s.id)}
			<li class="flex gap-4 px-4 py-4">
				<Thumb seed={s.id} src={s.imageId && mediaUrl(s.imageId, 'thumb')} />
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap gap-1.5">
						<Badge outline>{s.categoryName ?? m.admin_suggestion_no_category()}</Badge>
					</div>
					<h2 class="mt-1.5 text-h3">
						<a
							href={resolve('/admin/suggestions/[id]', { id: s.id })}
							class="no-underline hover:underline"
						>
							{s.title}
						</a>
					</h2>
					<p class="mt-0.5 text-small text-muted">
						{m.admin_suggestion_by({
							name: s.author ?? m.admin_confirmations_unknown_member(),
							date: formatDate(s.createdAt)
						})}
						{#if s.place}· {s.place}{/if}
					</p>
					{#if s.status === 'converted' && s.taskId}
						<a
							href={resolve('/admin/tasks/[id]', { id: s.taskId })}
							class="mt-2 inline-block text-small font-semibold"
						>
							{m.admin_suggestion_open_task()}
						</a>
					{:else if s.status === 'rejected' && s.rejectionNote}
						<p class="mt-2 text-small text-muted">{s.rejectionNote}</p>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{/if}
