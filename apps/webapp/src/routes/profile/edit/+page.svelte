<script lang="ts">
    import {enhance} from '$app/forms';
    import {m} from '#lib/paraglide/messages.js';
    import ProfileFields from '#lib/components/ProfileFields.svelte';
    import type {PageProps} from './$types';

    let {data, form}: PageProps = $props();
    const values = $derived(form?.values ?? data.values);
    const fields = $derived(form?.fields ?? {});
</script>

<h1 class="text-2xl font-semibold">{m.profile_edit_title()}</h1>

<form method="post" use:enhance class="mt-6 grid gap-4">
    <ProfileFields {values} {fields}/>
    <button class="justify-self-start rounded-md bg-black px-4 py-2 text-white">{m.profile_save()}</button>
</form>