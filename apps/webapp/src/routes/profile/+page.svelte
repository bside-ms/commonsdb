<script lang="ts">
    import {resolve} from '$app/paths';
    import {m} from '#lib/paraglide/messages.js';
    import type {PageProps} from './$types';

    let {data}: PageProps = $props();
    const p = $derived(data.profile);
    const roleLabel = {member: m.role_member, admin: m.role_admin, superadmin: m.role_superadmin};
</script>

<div class="flex items-baseline justify-between">
    <h1 class="text-2xl font-semibold">
        {p.displayName}
        {#if p.pronoun}<span class="text-base font-normal">({p.pronoun})</span>{/if}
    </h1>
    <a href={resolve('/profile/edit')} class="underline">{m.profile_edit()}</a>
</div>

<dl class="mt-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
    <dt>{m.login_email_label()}</dt>
    <dd>{data.email}</dd>
    {#if p.phone}
        <dt>{m.profile_phone()}</dt>
        <dd>{p.phone}</dd>
    {/if}
    {#if p.accessibilityNote}
        <dt>{m.profile_accessibility_note()}</dt>
        <dd>{p.accessibilityNote}</dd>
    {/if}
    <dt>{m.profile_role()}</dt>
    <dd>{roleLabel[data.platformRole]()}</dd>
</dl>