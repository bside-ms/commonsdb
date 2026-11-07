<script lang="ts">
    import '@fontsource/archivo/400.css';
    import '@fontsource/archivo/500.css';
    import '@fontsource/archivo/600.css';
    import archivo400 from '@fontsource/archivo/files/archivo-latin-400-normal.woff2?url';

    import '../app.css';
    import favicon from '#lib/assets/favicon.svg';
    import {m} from '#lib/paraglide/messages.js';
    import {AppShell, Avatar, Button, Toaster} from '#lib/ui';
    import {adminNav, memberNav} from '#lib/navigation.ts';
    import type {LayoutProps} from './$types';
    import {resolve} from '$app/paths';
    import {page} from '$app/state';

    let {children, data}: LayoutProps = $props();

    const path = $derived(page.url.pathname);
    const inAdmin = $derived(path === resolve('/admin') || path.startsWith(`${resolve('/admin')}/`));
    // during onboarding every other page redirects back, so no nav there
    const inOnboarding = $derived(path.startsWith(resolve('/onboarding')));
</script>

<svelte:head>
    <link rel="icon" href={favicon}/>
    <title>{m.app_name()}</title>
    <link rel="preload" href={archivo400} as="font" type="font/woff2" crossorigin="anonymous"/>
</svelte:head>

{#snippet logout()}
    <form method="post" action="/logout">
        <Button type="submit" size="sm" variant="ghost">{m.logout()}</Button>
    </form>
{/snippet}

{#if data.user && inAdmin}
    {@const user = data.user}
    <AppShell variant="admin" items={adminNav()} homeHref={resolve('/admin')} title={m.nav_admin()}>
        {#snippet footer()}
            <div class="grid gap-3">
                <a href={resolve('/profile')} class="flex items-center gap-2 text-small font-semibold no-underline">
                    <Avatar name={user.displayName} size="sm" decorative/>
                    {user.displayName}
                </a>
                <a href={resolve('/')} class="text-small font-semibold underline underline-offset-3"
                >{m.nav_back_to_app()}</a
                >
                {@render logout()}
            </div>
        {/snippet}
        {@render children()}
    </AppShell>
{:else if data.user}
    {@const user = data.user}
    <AppShell
            variant="member"
            items={inOnboarding ? [] : memberNav()}
            homeHref={resolve('/')}
            title={m.app_name()}
    >
        {#snippet actions()}
            {#if user.isAdmin && !inOnboarding}
                <Button size="sm" variant="ghost" href={resolve('/admin')}>{m.nav_admin()}</Button>
            {/if}
            {#if !inOnboarding}
                <a
                        href={resolve('/profile')}
                        class="flex items-center gap-2 border border-transparent p-0.5 font-semibold no-underline hover:border-ink"
                >
                    <Avatar name={user.displayName} decorative/>
                    <span class="hidden sm:inline">{user.displayName}</span>
                    <span class="sr-only sm:hidden">{user.displayName}</span>
                </a>
            {/if}
            {@render logout()}
        {/snippet}
        {@render children()}
    </AppShell>
{:else}
    <main id="main" class="mx-auto max-w-lg px-4 py-10">
        {@render children()}
    </main>
{/if}

<Toaster/>
