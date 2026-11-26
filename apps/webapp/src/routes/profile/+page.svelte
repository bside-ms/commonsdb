<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { mediaUrl } from '#lib/media.ts';
	import { Avatar, Button, Card, Checkbox, toast } from '#lib/ui';
	import { messagingSettings, saveDmOpen, unblock } from '../messages/messages.remote';
	import PhotoCard from './PhotoCard.svelte';
	import type { PageProps } from './$types';
	import LogoutButton from '#lib/components/LogoutButton.svelte';

	let { data }: PageProps = $props();
	const p = $derived(data.profile);
	const roleLabel = { member: m.role_member, admin: m.role_admin, superadmin: m.role_superadmin };

	const messaging = $derived(await messagingSettings());
</script>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div class="flex items-center gap-4">
		<Avatar
			name={p.displayName}
			src={p.photoId && mediaUrl(p.photoId, 'thumb')}
			size="lg"
			decorative
		/>
		<h1>
			{p.displayName}
			{#if p.pronoun}<span class="text-body font-normal text-muted">({p.pronoun})</span>{/if}
		</h1>
	</div>
	<Button variant="ghost" size="sm" href={resolve('/profile/edit')}>{m.profile_edit()}</Button>
</div>

<Card class="mt-8 max-w-2xl">
	<dl class="grid gap-x-6 gap-y-3 text-small sm:grid-cols-[max-content_1fr]">
		<dt class="font-semibold text-muted">{m.login_email_label()}</dt>
		<dd>{data.email}</dd>
		{#if p.phone}
			<dt class="font-semibold text-muted">{m.profile_phone()}</dt>
			<dd>{p.phone}</dd>
		{/if}
		{#if p.accessibilityNote}
			<dt class="font-semibold text-muted">{m.profile_accessibility_note()}</dt>
			<dd class="whitespace-pre-line">{p.accessibilityNote}</dd>
		{/if}
		<dt class="font-semibold text-muted">{m.profile_role()}</dt>
		<dd>{roleLabel[data.platformRole]()}</dd>
	</dl>
</Card>

<PhotoCard profile={p} />

<Card class="mt-6 max-w-2xl" title={m.profile_messages_title()}>
	<form
		{...saveDmOpen.enhance(async ({ submit }) => {
			if (await submit()) toast(m.profile_messages_saved_toast());
		})}
		class="grid gap-3"
	>
		<Checkbox
			{...saveDmOpen.fields.dmOpen.as('checkbox', messaging.dmOpen)}
			label={m.profile_dm_open()}
			hint={m.profile_dm_open_hint()}
		/>
		<div>
			<Button type="submit" size="sm" disabled={saveDmOpen.pending > 0}>{m.profile_save()}</Button>
		</div>
	</form>

	<h3 class="mt-6">{m.profile_blocked_title()}</h3>
	{#if messaging.blocked.length === 0}
		<p class="mt-1 text-small text-muted">{m.profile_blocked_none()}</p>
	{:else}
		<ul class="mt-2 divide-y divide-hair border border-ink">
			{#each messaging.blocked as person (person.id)}
				{@const f = unblock.for(person.id)}
				<li class="flex items-center justify-between gap-3 px-3 py-2">
					<span class="flex items-center gap-2 font-semibold">
						<Avatar
							name={person.name}
							src={person.photoId && mediaUrl(person.photoId, 'thumb')}
							size="sm"
							decorative
						/>
						{person.name}
					</span>
					<form
						{...f.enhance(async ({ submit }) => {
							if (await submit()) toast(m.profile_unblocked_toast({ name: person.name }));
						})}
					>
						<input {...f.fields.userId.as('hidden', person.id)} />
						<Button type="submit" size="sm" variant="ghost">{m.profile_unblock()}</Button>
					</form>
				</li>
				{#each f.fields.issues() ?? [] as issue (issue.message)}
					<li role="alert" class="px-3 py-2 text-small text-danger">
						{errorMessage(issue.message)}
					</li>
				{/each}
			{/each}
		</ul>
	{/if}
</Card>

<LogoutButton size="md" block class="mt-10 lg:hidden" />
