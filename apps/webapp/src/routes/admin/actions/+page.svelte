<!--
	Aktionen for admins: upcoming first (soonest on top), then past ones.
-->
<script lang="ts">
	import { CalendarDays, Plus } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate } from '#lib/format.ts';
	import { Badge, Button, EmptyState } from '#lib/ui';
	import { adminActions } from './actions.remote';

	const items = $derived(await adminActions());
	const today = new Date().toLocaleDateString('sv'); // YYYY-MM-DD
</script>

<svelte:head><title>{m.admin_actions_title()} · {m.app_name()}</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<h1>{m.admin_actions_title()}</h1>
	<Button href={resolve('/admin/actions/new')}>
		<Plus class="size-4.5" strokeWidth={2} aria-hidden="true" />
		{m.admin_actions_new()}
	</Button>
</div>
<p class="mt-3 max-w-[60ch] text-small text-muted">{m.admin_actions_intro()}</p>

{#if items.length === 0}
	<EmptyState
		class="mt-6"
		icon={CalendarDays}
		title={m.admin_actions_empty_title()}
		description={m.admin_actions_empty_hint()}
	/>
{:else}
	<ul class="mt-6 divide-y divide-ink border border-ink bg-paper">
		{#each items as item (item.id)}
			<li class="px-4 py-4">
				<div class="flex flex-wrap gap-1.5">
					{#if !item.publishedAt}<Badge>{m.admin_actions_draft()}</Badge>{/if}
					{#if item.date < today}<Badge outline>{m.admin_actions_past()}</Badge>{/if}
				</div>
				<h2 class="mt-1.5 text-h3">
					<a
						href={resolve('/admin/actions/[id]', { id: item.id })}
						class="no-underline hover:underline"
					>
						{item.title}
					</a>
				</h2>
				<p class="mt-0.5 text-small text-muted">
					{[
						formatDate(new Date(item.date)),
						item.startsTime && `${item.startsTime}–${item.endsTime}`,
						item.place
					]
						.filter(Boolean)
						.join(' · ')}
					{#if item.leads.length}
						· {m.action_leads()}: {item.leads.map((l) => l.name).join(', ')}
					{/if}
				</p>
			</li>
		{/each}
	</ul>
{/if}
