<!--
	One member. The adjustment form sits in a <details>: works without JS,
	and a correction is rare enough to stay folded away.
-->
<script lang="ts">
	import type { MemberBalance } from '@commonsdb/core';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { formatRepros } from '#lib/format.ts';
	import { Badge, Button, FormField, Input, Textarea, toast } from '#lib/ui';
	import { adjust } from './members.remote';

	let { member }: { member: MemberBalance } = $props();

	const f = $derived(adjust.for(member.id));
	let open = $state(false);

	const err = (field: { issues(): { message: string }[] | undefined }) => {
		const issue = field.issues()?.[0];
		return issue ? errorMessage(issue.message) : undefined;
	};
	const roleLabel = $derived(
		member.role === 'superadmin'
			? m.role_superadmin()
			: member.role === 'admin'
				? m.role_admin()
				: null
	);
</script>

<li class="grid gap-3 px-4 py-3.5">
	<div class="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
		<div class="min-w-0">
			<p class="font-semibold">
				{member.name}
				{#if roleLabel}
					<Badge class="ml-1.5">{roleLabel}</Badge>
				{/if}
			</p>
			<p class="text-small text-muted">{member.email}</p>
		</div>
		<p class="text-h3 tabular-nums" class:text-danger={member.balanceTenths < 0}>
			{m.ui_repros({ amount: formatRepros(member.balanceTenths) })}
		</p>
	</div>

	<details bind:open class="text-small">
		<summary class="cursor-pointer font-semibold">{m.admin_members_adjust()}</summary>
		<form
			{...f.enhance(async ({ form, submit }) => {
				if (await submit()) {
					form.reset();
					open = false;
					toast(m.admin_members_adjusted_toast());
				}
			})}
			class="mt-3 grid max-w-md gap-3"
		>
			<input {...f.fields.userId.as('hidden', member.id)} />
			<FormField
				label={m.admin_members_amount()}
				hint={m.admin_members_amount_hint()}
				error={err(f.fields.amount)}
			>
				<Input {...f.fields.amount.as('text')} inputmode="decimal" required class="max-w-32" />
			</FormField>
			<FormField
				label={m.admin_members_memo()}
				hint={m.admin_members_memo_hint()}
				error={err(f.fields.memo)}
			>
				<Textarea {...f.fields.memo.as('text')} rows={2} maxlength={500} required />
			</FormField>
			<Button type="submit" variant="accent" disabled={f.pending > 0}>
				{m.admin_members_adjust_submit()}
			</Button>
			{#each f.fields.userId.issues() ?? [] as issue (issue.message)}
				<p role="alert" class="font-semibold text-danger">{errorMessage(issue.message)}</p>
			{/each}
		</form>
	</details>
</li>