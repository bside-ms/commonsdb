<script lang="ts">
    import './layout.css';
    import favicon from '#lib/assets/favicon.svg';
    import {m} from '#lib/paraglide/messages.js';
    import type {LayoutProps} from './$types';

    let {children, data}: LayoutProps = $props();
</script>

<svelte:head>
    <link rel="icon" href={favicon}/>
    <title>{m.app_name()}</title>
</svelte:head>

{#if data.user}
    <header class="flex items-center justify-between border-b px-4 py-3">
        <span>{data.user.name} · {data.user.email}</span>
        <form method="post" action="/logout">
            <button class="underline">{m.logout()}</button>
        </form>
    </header>
{/if}

{@render children()}
