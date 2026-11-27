<script lang="ts">
	import { Ticket } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { EmptyState } from '#lib/ui';
	import { adminClaims, people } from './claims.remote';
	import ClaimRow from './ClaimRow.svelte';

	const [claims, persons] = $derived(await Promise.all([adminClaims(), people()]));
</script>

<svelte:head><title>{m.admin_claims_title()} · {m.app_name()}</title></svelte:head>

<h1>{m.admin_claims_title()}</h1>
<p class="mt-3 max-w-[60ch] text-small text-muted">{m.admin_claims_intro()}</p>

{#if claims.length === 0}
	<EmptyState class="mt-6" icon={Ticket} title={m.admin_claims_empty()} />
{:else}
	<ul class="mt-6 divide-y divide-ink border border-ink bg-paper">
		{#each claims as claim (claim.id)}
			<ClaimRow {claim} people={persons} />
		{/each}
	</ul>
{/if}