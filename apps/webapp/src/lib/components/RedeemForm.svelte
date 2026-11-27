<!--
	Redeem a guest code. Prefilled from the QR link; empty on the account
	page. On success it says what was credited.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError as err } from '#lib/i18n/errors.ts';
	import { formatHours } from '#lib/format.ts';
	import { Button, FormField, Input } from '#lib/ui';
	import { redeem } from '#lib/remote/redeem.remote.ts';

	let { code = '' }: { code?: string } = $props();
	const f = $derived(redeem.fields);
</script>

{#if redeem.result}
	<div role="status" class="border border-ink bg-area-commons p-4">
		<p class="font-semibold">
			{m.redeem_done({
				hours: formatHours(redeem.result.hoursTenths),
				task: redeem.result.taskTitle
			})}
		</p>
		<Button class="mt-3" size="sm" href={resolve('/account')}>{m.redeem_to_account()}</Button>
	</div>
{:else}
	<form {...redeem} class="flex flex-wrap items-end gap-2">
		<FormField label={m.redeem_field()} error={err(f.code)} class="min-w-48 flex-1">
			<Input
				{...f.code.as('text', code)}
				autocomplete="off"
				autocapitalize="characters"
				spellcheck="false"
				class="font-mono tracking-widest uppercase"
				required
			/>
		</FormField>
		<Button type="submit" disabled={redeem.pending > 0}>{m.redeem_submit()}</Button>
	</form>
	{#each f.issues() ?? [] as issue (issue.message)}
		<p role="alert" class="mt-2 font-semibold text-danger">{errorMessage(issue.message)}</p>
	{/each}
{/if}
