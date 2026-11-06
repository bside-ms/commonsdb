<script lang="ts">
    import './layout.css';
    import favicon from '#lib/assets/favicon.svg';
    import {m} from '#lib/paraglide/messages.js';
    import type {LayoutProps} from './$types';
    import {resolve} from '$app/paths';

    let {children, data}: LayoutProps = $props();
</script>

<svelte:head>
    <link rel="icon" href={favicon}/>
    <title>{m.app_name()}</title>
</svelte:head>

{#if data.user}
    <header class="flex items-center justify-between border-b px-4 py-3">
        <a href={resolve('/')} class="font-semibold">{m.app_name()}</a>
        <nav class="flex items-center gap-4">
            <a href={resolve('/profile')}>{data.user.displayName}</a>
            {#if data.user.isAdmin}<a href={resolve('/admin')}>{m.nav_admin()}</a>{/if}
            <form method="post" action="/logout">
                <button class="underline">{m.logout()}</button>
            </form>
        </nav>
    </header>
{/if}

{@render children()}
