<!--
	Confirmation queue: reported shifts in the admin's categories, oldest
	first. Each row owns its forms (see ConfirmationRow).
-->
<script lang="ts">
	import { CheckCheck } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { EmptyState } from '#lib/ui';
	import { confirmations } from './confirmations.remote';
	import ConfirmationRow from './ConfirmationRow.svelte';

	const items = $derived(await confirmations());
</script>

<svelte:head><title>{m.admin_confirmations_title()} · {m.app_name()}</title></svelte:head>

<h1>{m.admin_confirmations_title()}</h1>
<p class="mt-1 text-small text-muted">{m.admin_confirmations_intro()}</p>

{#if items.length === 0}
	<EmptyState
		class="mt-6"
		icon={CheckCheck}
		title={m.admin_confirmations_empty_title()}
		description={m.admin_confirmations_empty_hint()}
	/>
{:else}
	<ul class="mt-6 divide-y divide-ink border border-ink bg-paper">
		{#each items as item (item.shiftId)}
			<ConfirmationRow {item} />
		{/each}
	</ul>
{/if}