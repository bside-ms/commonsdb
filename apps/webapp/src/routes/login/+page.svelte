<script lang="ts">
    import {enhance} from '$app/forms';
    import {page} from '$app/state';
    import {m} from '#lib/paraglide/messages.js';
    import type {PageProps} from './$types';
    import type {LoginError} from './+page.server.ts';

    let {data, form}: PageProps = $props();

    const errorMessages: Record<LoginError, () => string> = {
        method_disabled: m.login_error_method_disabled,
        start_failed: m.login_error_start_failed,
        invalid_credentials: m.login_error_invalid_credentials
    };

    const redirectTo = $derived(page.url.searchParams.get('redirectTo'));
    const query = $derived(redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : '');
</script>

<h1 class="text-2xl font-semibold">{m.login_title()}</h1>

{#if page.url.searchParams.has('error')}
    <p class="mt-4 text-red-700">{m.login_error_oauth()}</p>
{/if}
{#if form?.code}<p class="mt-4 text-red-700">{errorMessages[form.code]()}</p>{/if}

{#if data.loginMethods.keycloak}
    <form method="post" action="?/keycloak{query}" class="mt-6">
        <button class="w-full rounded-md bg-black px-4 py-3 text-white">
            {m.login_keycloak_button()}
        </button>
    </form>
{/if}

{#if data.loginMethods.emailPassword}
    <form method="post" action="?/signIn{query}" use:enhance class="mt-8 grid gap-3">
        <label class="grid gap-1">
            {m.login_email_label()}
            <input name="email" type="email" value={form && 'email' in form ? form.email : ''} required/>
        </label>
        <label class="grid gap-1">
            {m.login_password_label()}
            <input name="password" type="password" required/>
        </label>
        <button class="justify-self-start rounded-md border px-4 py-2">{m.login_submit()}</button>
    </form>
{/if}