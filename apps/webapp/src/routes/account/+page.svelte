<!--
	The member's account: balance, then entries newest first. Thanks from
	the confirming admin sit inside their entry. The thanks card stays here
	until a second use.
-->
<script lang="ts">
	import { Wallet } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate, formatReproChange, formatRepros } from '#lib/format.ts';
	import { Balance, Button, EmptyState } from '#lib/ui';
	import { ownAccount } from './account.remote';
	import RedeemForm from '#lib/components/RedeemForm.svelte';

	const account = $derived(await ownAccount());
</script>

<svelte:head><title>{m.account_title()} · {m.app_name()}</title></svelte:head>

<h1>{m.account_title()}</h1>

<Balance
	class="mt-6 max-w-xs"
	value={formatRepros(account.balanceTenths)}
	label={m.account_balance_label()}
/>
<p class="mt-3 max-w-prose text-small text-muted">{m.account_intro()}</p>

<section class="mt-10" aria-labelledby="entries-heading">
	<h2 id="entries-heading">{m.account_entries()}</h2>

	{#if account.entries.length === 0}
		<EmptyState
			class="mt-3"
			icon={Wallet}
			title={m.account_empty_title()}
			description={m.account_empty_hint()}
		>
			{#snippet action()}
				<Button size="sm" href={resolve('/tasks')}>{m.home_browse_tasks()}</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<ul class="mt-3 max-w-3xl divide-y divide-ink border border-ink bg-paper">
			{#each account.entries as entry (entry.id)}
				<li class="grid gap-2 px-4 py-3.5">
					<div class="flex items-baseline justify-between gap-4">
						<div class="min-w-0">
							<p class="font-semibold">
								{#if entry.task}
									<a href={resolve('/tasks/[id]', { id: entry.task.id })}>{entry.task.title}</a>
								{:else}
									{m.account_adjustment()}
								{/if}
							</p>
							<p class="text-small text-muted">
								{formatDate(entry.createdAt)}
								{#if entry.memo}
									· {entry.memo}{/if}
							</p>
						</div>
						<p class="shrink-0 text-h3 tabular-nums" class:text-danger={entry.amountTenths < 0}>
							{formatReproChange(entry.amountTenths)}
						</p>
					</div>

					{#if entry.thanks}
						<blockquote class="border-l-4 border-area-commons pl-3 text-small">
							<p class="whitespace-pre-line">{entry.thanks.note}</p>
							<footer class="mt-1 text-muted">
								{entry.thanks.from
									? m.account_thanks_from({ name: entry.thanks.from })
									: m.account_thanks()}
							</footer>
						</blockquote>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section class="mt-10 max-w-lg" aria-labelledby="redeem-heading">
	<h2 id="redeem-heading">{m.redeem_title()}</h2>
	<p class="mt-2 text-small text-muted">{m.redeem_intro()}</p>
	<div class="mt-3"><RedeemForm /></div>
</section>
