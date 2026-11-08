<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { Button } from '#lib/ui';
	import ProfileFields from '#lib/components/ProfileFields.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const values = $derived(form?.values ?? data.values);
	const fields = $derived(form?.fields ?? {});
</script>

<h1>{m.profile_edit_title()}</h1>

<form method="post" use:enhance class="mt-6 grid gap-4">
	<ProfileFields {values} {fields} />
	<div class="flex flex-wrap gap-3">
		<Button type="submit">{m.profile_save()}</Button>
		<Button variant="ghost" href={resolve('/profile')}>{m.ui_cancel()}</Button>
	</div>
</form>
