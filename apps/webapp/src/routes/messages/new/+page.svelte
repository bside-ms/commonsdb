<!--
	Write to people. Everyone the member may reach is listed with a
	checkbox; one person makes a direct conversation, several a group.
	The name filter only hides rows (they stay in the form, so checked
	people are still sent); without JS the whole list is there.
	?to=<user id> preselects someone.
-->
<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { isAllowedHref, profiles } from '@commonsdb/richtext';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError } from '#lib/i18n/errors.ts';
	import { mediaUrl } from '#lib/media.ts';
	import { Avatar, Badge, Button, Editor, FormField, Input } from '#lib/ui';
	import { recipients, send } from '../messages.remote';

	const people = $derived(await recipients());
	const preselected = $derived(page.url.searchParams.getAll('to'));
	const f = send.fields;

	let filter = $state('');
	const visible = $derived.by(() => {
		const q = filter.trim().toLowerCase();
		return new Set(people.filter((p) => !q || p.name.toLowerCase().includes(q)).map((p) => p.id));
	});
</script>

<svelte:head><title>{m.messages_new()} · {m.app_name()}</title></svelte:head>

<a href={resolve('/messages')} class="inline-flex items-center gap-1.5 text-small font-semibold">
	<ArrowLeft class="size-4" strokeWidth={2} aria-hidden="true" />
	{m.messages_back()}
</a>
<h1 class="mt-4">{m.messages_new()}</h1>

<form {...send} class="mt-6 grid max-w-2xl gap-6">
	<fieldset class="grid gap-3">
		<legend class="mb-1 text-h3">{m.messages_to()}</legend>
		<Input
			type="search"
			bind:value={filter}
			aria-label={m.messages_filter_people()}
			placeholder={m.messages_filter_people()}
			onkeydown={(e) => e.key === 'Enter' && e.preventDefault()}
		/>
		{#if people.length === 0}
			<p class="text-small text-muted">{m.messages_nobody_reachable()}</p>
		{:else}
			<ul class="max-h-80 divide-y divide-hair overflow-y-auto border border-ink bg-paper">
				{#each people as person (person.id)}
					<li hidden={!visible.has(person.id)}>
						<label class="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-hover">
							<input
								{...f.to.as('checkbox', person.id, preselected.includes(person.id))}
								class="size-4.5 accent-ink"
							/>
							<Avatar
								name={person.name}
								src={person.photoId && mediaUrl(person.photoId, 'thumb')}
								size="sm"
								decorative
							/>
							<span class="font-semibold">{person.name}</span>
							{#if person.isAdmin}<Badge outline>{m.role_admin()}</Badge>{/if}
						</label>
					</li>
				{/each}
			</ul>
		{/if}
		{#if fieldError(f.to)}
			<p role="alert" class="text-small font-semibold text-danger">{fieldError(f.to)}</p>
		{/if}
	</fieldset>

	<FormField
		label={m.messages_subject()}
		hint={m.messages_subject_group_hint()}
		optional
		error={fieldError(f.subject)}
	>
		<Input {...f.subject.as('text')} maxlength={200} />
	</FormField>

	<FormField label={m.messages_body()} error={fieldError(f.body)}>
		<Editor
			name={f.body.as('hidden', '').name}
			extensions={profiles.message()}
			variant="message"
			{isAllowedHref}
		/>
	</FormField>

	{#each f.issues() ?? [] as issue (issue.message)}
		<p role="alert" class="font-semibold text-danger">{errorMessage(issue.message)}</p>
	{/each}

	<div class="flex flex-wrap gap-3">
		<Button type="submit" disabled={send.pending > 0}>{m.messages_send()}</Button>
		<Button variant="ghost" href={resolve('/messages')}>{m.ui_cancel()}</Button>
	</div>
</form>
