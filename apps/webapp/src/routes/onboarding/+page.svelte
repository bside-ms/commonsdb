<script lang="ts">
    import {enhance} from '$app/forms';
    import {m} from '#lib/paraglide/messages.js';
    import {errorMessage} from '#lib/i18n/errors.ts';
    import ProfileFields from '#lib/components/ProfileFields.svelte';
    import type {PageProps} from './$types';

    let {data, form}: PageProps = $props();
    const values = $derived(form?.values ?? data.values);
    const fields = $derived(form?.fields ?? {});
</script>

<h1 class="text-2xl font-semibold">{m.onboarding_title()}</h1>
<p class="mt-2">{m.onboarding_intro()}</p>

<form method="post" use:enhance class="mt-6 grid gap-4">
    <ProfileFields {values} {fields}/>

    <label>
        <input type="checkbox" name="acceptRules" required/>
        {m.onboarding_accept_rules()}
    </label>
    {#if fields.acceptRules}<span class="text-sm text-red-700">{errorMessage(fields.acceptRules)}</span>{/if}

    <button class="justify-self-start rounded-md bg-black px-4 py-2 text-white">
        {m.onboarding_submit()}
    </button>
</form>