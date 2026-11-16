<!--
	The member's inbox: every conversation they're part of, newest
	activity first, unread ones bold with a count. Two ways to start:
	to people (/messages/new) or to all admins (/messages/admins).
-->
<script lang="ts">
	import { Inbox } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatStamp } from '#lib/format.ts';
	import { Badge, Button, EmptyState } from '#lib/ui';
	import { inbox } from './messages.remote';
	import { kindLabel, threadTitle } from './thread-title.ts';

	const threads = $derived(await inbox());
</script>

<svelte:head><title>{m.messages_title()} · {m.app_name()}</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<h1>{m.messages_title()}</h1>
	<div class="flex flex-wrap gap-2">
		<Button size="sm" href={resolve('/messages/new')}>{m.messages_new()}</Button>
		<Button size="sm" variant="ghost" href={resolve('/messages/admins')}>
			{m.messages_new_admins()}
		</Button>
	</div>
</div>
<p class="mt-3 max-w-prose text-small text-muted">{m.messages_intro()}</p>

{#if threads.length === 0}
	<EmptyState
		class="mt-6"
		icon={Inbox}
		title={m.messages_empty_title()}
		description={m.messages_empty_hint()}
	/>
{:else}
	<ul class="mt-6 max-w-3xl divide-y divide-ink border border-ink bg-paper">
		{#each threads as t (t.id)}
			{@const label = kindLabel(t.kind)}
			<li>
				<a
					href={resolve('/messages/[id]', { id: t.id })}
					class="flex items-baseline justify-between gap-4 px-4 py-3.5 no-underline hover:bg-hover"
				>
					<span class="min-w-0">
						<span class={['block truncate', t.unread > 0 && 'font-semibold']}>
							{threadTitle(t)}
						</span>
						{#if label}
							<span class="text-small text-muted">{label}</span>
						{/if}
					</span>
					<span class="flex shrink-0 items-center gap-2 text-small text-muted">
						{#if t.unread > 0}
							<Badge tone="attention">{m.messages_unread({ count: t.unread })}</Badge>
						{/if}
						{formatStamp(t.lastMessageAt)}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
