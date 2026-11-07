<script lang="ts">
    import {enhance} from '$app/forms';
    import {m} from '#lib/paraglide/messages.js';
    import {errorMessage} from '#lib/i18n/errors.ts';
    import {Button, Checkbox} from "#lib/ui";
    import ProfileFields from '#lib/components/ProfileFields.svelte';
    import type {PageProps} from './$types';

    let {data, form}: PageProps = $props();
    const values = $derived(form?.values ?? data.values);
    const fields = $derived(form?.fields ?? {});
</script>

<h1>{m.onboarding_title()}</h1>
<p class="mt-3 text-muted">{m.onboarding_intro()}</p>

<form method="post" use:enhance class="mt-6 grid gap-4">
    <ProfileFields {values} {fields}/>

    <Checkbox
            name="acceptRules"
            required
            label={m.onboarding_accept_rules()}
            error={fields.acceptRules && errorMessage(fields.acceptRules)}
    />

    <div>
        <Button type="submit">{m.onboarding_submit()}</Button>
    </div>
</form>