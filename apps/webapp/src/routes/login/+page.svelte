<script lang="ts">
    import {enhance} from '$app/forms';
    import {page} from '$app/state';
    import type {PageProps} from './$types';

    let {data, form}: PageProps = $props();
    const redirectTo = $derived(page.url.searchParams.get('redirectTo'));
    const query = $derived(redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : '');
</script>

<h1 class="text-2xl font-semibold">Anmelden</h1>

{#if page.url.searchParams.has('error')}
    <p class="mt-4 text-red-700">Die Anmeldung ist fehlgeschlagen. Bitte versuch es noch einmal.</p>
{/if}
{#if form?.message}<p class="mt-4 text-red-700">{form.message}</p>{/if}

{#if data.loginMethods.keycloak}
    <form method="post" action="?/keycloak{query}" class="mt-6">
        <button class="w-full rounded-md bg-black px-4 py-3 text-white">Mit B-Side-Konto anmelden</button>
    </form>
{/if}

{#if data.loginMethods.emailPassword}
    <form method="post" action="?/signIn{query}" use:enhance class="mt-8 grid gap-3">
        <label class="grid gap-1">
            E-Mail
            <input name="email" type="email" value={form && 'email' in form ? form.email : ''} required/>
        </label>
        <label class="grid gap-1">Passwort <input name="password" type="password" required/></label>
        <button class="justify-self-start rounded-md border px-4 py-2">Anmelden</button>
    </form>
{/if}