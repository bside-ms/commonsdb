<!--
	Members with their roles and balances (superadmins). Minimal on
	purpose: search comes with the member admin.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { memberBalances } from './members.remote';
	import MemberRow from './MemberRow.svelte';

	const members = $derived(await memberBalances());
</script>

<svelte:head><title>{m.admin_members_title()} · {m.app_name()}</title></svelte:head>

<h1>{m.admin_members_title()}</h1>
<p class="mt-1 text-small text-muted">{m.admin_members_intro()}</p>

<ul class="mt-6 divide-y divide-ink border border-ink bg-paper">
	{#each members as member (member.id)}
		<MemberRow {member} />
	{/each}
</ul>
