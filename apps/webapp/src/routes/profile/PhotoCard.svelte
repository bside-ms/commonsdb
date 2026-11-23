<!--
	Profile picture: shows the current one (or initials), uploads a new one
	and removes it. Plain multipart forms: work without JS; with JS a
	picked file is previewed before it's sent.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { ACCEPTED_TYPES, MAX_BYTES } from '@commonsdb/media/kinds';
	import type { Profile } from '@commonsdb/db/schema';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { mediaUrl } from '#lib/media.ts';
	import { Avatar, Button, Card, FileInput, FormField, toast } from '#lib/ui';
	import { removePhoto, uploadPhoto } from './photo.remote';

	type Props = { profile: Pick<Profile, 'displayName' | 'photoId' | 'photoVisibility'> };
	let { profile: p }: Props = $props();

	let preview = $state<string | null>(null);

	function pick(e: Event & { currentTarget: HTMLInputElement }) {
		if (preview) URL.revokeObjectURL(preview);
		const file = e.currentTarget.files?.[0];
		preview = file ? URL.createObjectURL(file) : null;
	}

	function clearPreview() {
		if (preview) URL.revokeObjectURL(preview);
		preview = null;
	}

	$effect(() => () => {
		if (preview) URL.revokeObjectURL(preview);
	});

	const src = $derived(preview ?? (p.photoId ? mediaUrl(p.photoId, 'thumb') : null));
	const seenBy = {
		members: m.profile_photo_seen_members,
		admins: m.profile_photo_seen_admins,
		nobody: m.profile_photo_seen_nobody
	};
	const fileIssue = $derived(uploadPhoto.fields.photo.issues()?.[0]?.message);
	const maxMb = MAX_BYTES.image / 1024 / 1024;
</script>

<Card class="mt-6 max-w-2xl" title={m.profile_photo_title()}>
	<div class="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
		<Avatar name={p.displayName} {src} size="lg" decorative />

		<div class="grid gap-4">
			<p class="text-small text-muted">
				{seenBy[p.photoVisibility]()}
				<a href={resolve('/profile/edit')}>{m.profile_photo_change_visibility()}</a>
			</p>

			<!-- multipart: remote forms don't add it on their own -->
			<form
				{...uploadPhoto.enhance(async ({ element, submit }) => {
					if (await submit()) {
						element.reset();
						clearPreview();
						toast(m.profile_photo_saved_toast());
					}
				})}
				enctype="multipart/form-data"
				class="grid gap-3"
			>
				<FormField
					label={p.photoId ? m.profile_photo_replace() : m.profile_photo_choose()}
					hint={m.profile_photo_hint({ max: maxMb })}
					error={fileIssue && errorMessage(fileIssue)}
				>
					<FileInput
						{...uploadPhoto.fields.photo.as('file')}
						accept={ACCEPTED_TYPES.join(',')}
						onchange={pick}
						required
					/>
				</FormField>
				<div>
					<Button type="submit" size="sm" disabled={uploadPhoto.pending > 0}>
						{m.profile_photo_upload()}
					</Button>
				</div>
			</form>

			{#if p.photoId}
				<form
					{...removePhoto.enhance(async ({ submit }) => {
						if (await submit()) toast(m.profile_photo_removed_toast());
					})}
				>
					<Button
						type="submit"
						size="sm"
						variant="ghost"
						tone="danger"
						disabled={removePhoto.pending > 0}
					>
						{m.profile_photo_remove()}
					</Button>
				</form>
			{/if}
		</div>
	</div>
</Card>
