<!--
	One guest claim for admins: what, who recorded it, state; for unclaimed
	ones "Zuordnen" (works after expiry too) and "Neuen Code ausstellen".
-->
<script lang="ts">
	import type { GuestClaimItem } from '@commonsdb/core';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { formatDate, formatHours } from '#lib/format.ts';
	import { Badge, Button, Select } from '#lib/ui';
	import { assignClaim, reissueClaim } from './claims.remote';

	type Props = { claim: GuestClaimItem; people: { id: string; name: string }[] };
	let { claim, people }: Props = $props();

	const assign = $derived(assignClaim.for(claim.id));
	const reissue = $derived(reissueClaim.for(claim.id));
	const issues = $derived([...(assign.fields.issues() ?? []), ...(reissue.fields.issues() ?? [])]);
	const tone = { open: 'attention', expired: 'neutral', claimed: 'success' } as const;
	const label = $derived(
		{
			open: m.admin_claims_state_open(),
			expired: m.admin_claims_state_expired(),
			claimed: m.admin_claims_state_claimed()
		}[claim.state]
	);
</script>

<li class="grid gap-2 px-4 py-4">
	<div class="flex flex-wrap items-center gap-1.5">
		<Badge tone={tone[claim.state]}>{label}</Badge>
		{#if claim.actionTitle}<Badge outline>{claim.actionTitle}</Badge>{/if}
	</div>
	<p class="font-semibold">
		<a href={resolve('/admin/tasks/[id]', { id: claim.task.id })}>{claim.task.title}</a>
		· {claim.guestName ?? m.action_guest()}
	</p>
	<p class="text-small text-muted">
		{m.admin_claims_meta({
			hours: formatHours(claim.hoursTenths),
			by: claim.createdBy ?? '—',
			date: formatDate(claim.createdAt)
		})}
		{#if claim.claimedAt}
			· {m.admin_claims_claimed_by({
				name: claim.claimedBy ?? '—',
				date: formatDate(claim.claimedAt)
			})}
		{/if}
	</p>

	{#if claim.state !== 'claimed'}
		<div class="flex flex-wrap items-end gap-2">
			<form {...assign} class="flex flex-wrap items-end gap-2">
				<input {...assign.fields.claimId.as('hidden', claim.id)} />
				<Select
					{...assign.fields.userId.as('select', '')}
					aria-label={m.admin_claims_assign_label()}
					placeholder={m.admin_claims_assign_label()}
					options={people.map((p) => ({ value: p.id, label: p.name }))}
					required
				/>
				<Button type="submit" size="sm" disabled={assign.pending > 0}
					>{m.admin_claims_assign()}</Button
				>
			</form>
			<form {...reissue}>
				<input {...reissue.fields.claimId.as('hidden', claim.id)} />
				<Button type="submit" size="sm" variant="ghost" disabled={reissue.pending > 0}>
					{m.admin_claims_reissue()}
				</Button>
			</form>
		</div>
		{#if reissue.result}
			<p role="status" class="border border-ink bg-sunken p-2 text-small">
				{m.admin_claims_new_code({
					code: reissue.result.code,
					date: formatDate(new Date(reissue.result.expiresAt))
				})}
			</p>
		{/if}
	{/if}

	{#each issues as issue (issue.message)}
		<p role="alert" class="text-small font-semibold text-danger">{errorMessage(issue.message)}</p>
	{/each}
</li>
