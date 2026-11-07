<script lang="ts">
    import {resolve} from '$app/paths';
    import {m} from '#lib/paraglide/messages.js';
    import {Avatar, Button, Card} from '#lib/ui';
    import type {PageProps} from './$types';

    let {data}: PageProps = $props();
    const p = $derived(data.profile);
    const roleLabel = {member: m.role_member, admin: m.role_admin, superadmin: m.role_superadmin};
</script>

<div class="flex flex-wrap items-end justify-between gap-4">
    <div class="flex items-center gap-4">
        <Avatar name={p.displayName} size="lg" decorative/>
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