<!--
	Record guest work on a task of an Aktion (leads on the day, admins).
	After submitting, the slip with code and QR replaces the form: print
	it or show it; the code isn't shown again anywhere.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError as err } from '#lib/i18n/errors.ts';
	import { formatDate, formatHours, hoursValue } from '#lib/format.ts';
	import { Button, FormField, Input } from '#lib/ui';
	import { guestTask, recordGuest } from '../../../aktion.remote';

	const actionId = $derived(page.params.id!);
	const t = $derived(await guestTask(page.params.taskId!));
	const f = $derived(recordGuest.fields);
	const slip = $derived(recordGuest.result);
</script>

<svelte:head><title>{m.guest_title()} · {m.app_name()}</title></svelte:head>

{#if slip}
	<div class="guest-slip mx-auto max-w-sm border border-ink bg-paper p-6 text-center">
		<p class="text-h3">{m.guest_slip_title()}</p>
		<p class="mt-2 text-small">
			{m.guest_slip_text({ hours: formatHours(slip.hoursTenths), task: t.title })}
		</p>
		<p class="mt-4 font-mono text-[2rem] font-semibold tracking-widest">{slip.code}</p>
		<div class="mx-auto mt-4 w-44" aria-hidden="true">{@html slip.qr}</div>
		<p class="mt-4 text-tiny break-all text-muted">{m.guest_slip_url({ url: slip.url })}</p>
		<p class="mt-1 text-tiny text-muted">
			{m.guest_slip_until({ date: formatDate(new Date(slip.expiresAt)) })}
		</p>
	</div>
	<div class="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
		<Button onclick={() => window.print()}>{m.guest_print()}</Button>
		<Button variant="ghost" href={page.url.pathname} data-sveltekit-reload>{m.guest_next()}</Button>
		<Button variant="ghost" href={resolve('/aktion/[id]', { id: actionId })}
			>{m.guest_back()}</Button
		>
	</div>
{:else}
	<p class="text-small text-muted">{m.guest_title()}</p>
	<h1 class="mt-1">{t.title}</h1>
	<p class="mt-3 max-w-[52ch] text-small text-muted">{m.guest_intro()}</p>

	<form {...recordGuest} class="mt-6 grid max-w-md gap-5">
		<input {...f.taskId.as('hidden', t.id)} />
		<FormField label={m.guest_field_hours()} error={err(f.hours)}>
			<Input
				{...f.hours.as('text', hoursValue(t.hoursTenths))}
				inputmode="decimal"
				class="max-w-28"
				required
			/>
		</FormField>
		<FormField
			label={m.guest_field_name()}
			hint={m.guest_field_name_hint()}
			optional
			error={err(f.guestName)}
		>
			<Input {...f.guestName.as('text', '')} maxlength={80} autocomplete="off" />
		</FormField>
		{#each f.issues() ?? [] as issue (issue.message)}
			<p role="alert" class="font-semibold text-danger">{errorMessage(issue.message)}</p>
		{/each}
		<div class="flex flex-wrap gap-3">
			<Button type="submit" disabled={recordGuest.pending > 0}>{m.guest_submit()}</Button>
			<Button variant="ghost" href={resolve('/aktion/[id]', { id: actionId })}
				>{m.ui_cancel()}</Button
			>
		</div>
	</form>
{/if}

<style>
	@media print {
		:global(header, nav) {
			display: none !important;
		}
	}
</style>
