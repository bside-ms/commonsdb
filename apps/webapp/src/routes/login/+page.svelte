<script lang="ts">
    import {enhance} from '$app/forms';
    import {page} from '$app/state';
    import {m} from '#lib/paraglide/messages.js';
    import {Button, FormField, Input} from "#lib/ui";
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

<h1>{m.login_title()}</h1>

{#if page.url.searchParams.has('error')}
    <p class="mt-4 font-semibold text-danger" role="alert">{m.login_error_oauth()}</p>
{/if}
{#if form?.code}
    <p class="mt-4 font-semibold text-danger" role="alert">{errorMessages[form.code]()}</p>
{/if}

{#if data.loginMethods.keycloak}
    <form method="post" action="?/keycloak{query}" class="mt-8">
        <Button type="submit" block>{m.login_keycloak_button()}</Button>
    </form>
{/if}

{#if data.loginMethods.emailPassword}
    <form
            method="post"
            action="?/signIn{query}"
            use:enhance
            class="mt-8 grid gap-4 border-t border-ink pt-8"
    >
        <FormField label={m.login_email_label()}>
            <Input
                    name="email"
                    type="email"
                    autocomplete="email"
                    value={form && 'email' in form ? form.email : ''}
                    required
            />
        </FormField>
        <FormField label={m.login_password_label()}>
            <Input name="password" type="password" autocomplete="current-password" required/>
        </FormField>
        <div>
            <Button type="submit" variant="ghost">{m.login_submit()}</Button>
        </div>
    </form>
{/if}