<!--
	@component
	The app frame. One component, two variants:

	member: sticky header; below `lg` a fixed bottom nav, from `lg` a side
	        nav (250px). Active item = area colour (+ 5px ink edge on desktop).
	admin:  side nav (236px) on canvas background, active = 4px orange edge;
	        below `md` the nav becomes a horizontal strip under the brand.

	Nav items come from the caller (see #lib/navigation.ts), already
	translated and resolved. With fewer than two items the nav is hidden.

	<AppShell variant="member" items={memberNav()} homeHref={resolve('/')} title={m.app_name()}>
		{#snippet actions()}…avatar, logout…{/snippet}
		{@render children()}
	</AppShell>
-->
<script lang="ts">
    import type {Snippet} from 'svelte';
    import {page} from '$app/state';
    import {m} from '#lib/paraglide/messages.js';
    import logo from '#lib/assets/bside-logo.svg';
    import {cn} from '#lib/ui';
    import type {Area, NavItem} from './types.ts';

    type Props = {
        variant?: 'member' | 'admin';
        items: NavItem[];
        /** Where the logo links to. */
        homeHref: string;
        /** Text next to the logo. */
        title: string;
        /** member: right side of the header. admin: next to the brand. */
        actions?: Snippet;
        /** admin only: bottom of the side nav (user, back to app, logout). */
        footer?: Snippet;
        children: Snippet;
    };

    let {variant = 'member', items, homeHref, title, actions, footer, children}: Props = $props();

    const showNav = $derived(items.length > 1);

    const isCurrent = (item: NavItem) => {
        const path = page.url.pathname;
        if (item.match) return item.match(path);
        if (item.href === homeHref) return path === item.href;
        return path === item.href || path.startsWith(`${item.href}/`);
    };

    // full class names, so Tailwind sees them
    const AREA_BG: Record<Area, string> = {
        start: 'bg-area-start',
        tasks: 'bg-area-tasks',
        commons: 'bg-area-commons',
        init: 'bg-area-init',
        qual: 'bg-area-qual'
    };
</script>

<a
        href="#main"
        class="sr-only z-100 bg-ink px-4 py-3 font-semibold text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
>{m.ui_skip_to_content()}</a
>

{#if variant === 'member'}
    <div
            class="min-h-dvh bg-paper lg:grid lg:h-dvh lg:grid-cols-[var(--shell-member-side)_1fr] lg:grid-rows-[auto_1fr]"
    >
        <header
                class="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink bg-paper px-3 py-2.5 lg:col-span-2 lg:px-6.5 lg:py-3"
        >
            <a href={homeHref} class="flex items-center gap-2.5 font-semibold no-underline">
                <img src={logo} alt="" class="h-8 w-auto"/>
                <span>{title}</span>
            </a>
            {#if actions}
                <div class="flex items-center gap-2">{@render actions()}</div>
            {/if}
        </header>

        {#if showNav}
            <nav
                    aria-label={m.ui_nav_main()}
                    class="fixed inset-x-0 bottom-0 z-40 grid auto-cols-fr grid-flow-col border-t border-ink bg-paper lg:static lg:flex lg:flex-col lg:overflow-y-auto lg:border-t-0 lg:border-r lg:py-5.5"
            >
                {#each items as item (item.href)}
                    {@const current = isCurrent(item)}
                    <a
                            href={item.href}
                            aria-current={current ? 'page' : undefined}
                            class={cn(
							'flex min-h-14 flex-col items-center justify-center gap-0.75 border-l border-hair px-0.5 py-2.5 text-[0.65625rem] font-semibold no-underline first:border-l-0',
							'lg:min-h-0 lg:flex-row lg:justify-start lg:gap-2.75 lg:border-l-5 lg:border-transparent lg:px-5 lg:py-2.75 lg:text-button lg:first:border-l-5',
							current
								? [AREA_BG[item.area ?? 'start'], 'lg:border-l-ink']
								: 'hover:bg-hover lg:hover:bg-hover'
						)}
                    >
                        {#if item.icon}
                            <item.icon class="size-5.25" strokeWidth={1.9} aria-hidden="true"/>
                        {/if}
                        <span>{item.label}</span>
                    </a>
                {/each}
            </nav>
        {/if}

        <main
                id="main"
                tabindex="-1"
                class={cn(
				'px-4 pt-4.5 outline-none lg:overflow-y-auto lg:px-10 lg:pt-7.5 lg:pb-20',
				showNav ? 'pb-30' : 'pb-12 lg:col-span-2'
			)}
        >
            <div class="max-w-(--content-max) xl:max-w-330">{@render children()}</div>
        </main>
    </div>
{:else}
    <div class="min-h-dvh bg-canvas md:grid md:grid-cols-[var(--shell-admin-side)_1fr]">
        <aside
                class="border-b border-ink bg-paper md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:overflow-y-auto md:border-r md:border-b-0 md:py-4"
        >
            <div
                    class="flex items-center justify-between gap-2.25 px-4 py-3 md:mb-2.5 md:border-b md:border-ink md:pt-0 md:pb-3.5"
            >
                <a href={homeHref} class="flex items-center gap-2.25 font-semibold no-underline">
                    <img src={logo} alt="" class="h-10 w-auto"/>
                    <span>{title}</span>
                </a>
                {#if actions}
                    <div class="flex items-center gap-2">{@render actions()}</div>
                {/if}
            </div>

            {#if showNav}
                <nav
                        aria-label={m.ui_nav_main()}
                        class="flex overflow-x-auto border-t border-ink md:flex-col md:border-t-0"
                >
                    {#each items as item (item.href)}
                        {@const current = isCurrent(item)}
                        <a
                                href={item.href}
                                aria-current={current ? 'page' : undefined}
                                class={cn(
								'flex items-center justify-between gap-2 border-b-4 px-4 py-2.5 text-small font-semibold whitespace-nowrap no-underline hover:bg-canvas',
								'md:border-b-0 md:border-l-4',
								current ? 'border-accent bg-canvas' : 'border-transparent'
							)}
                        >
							<span class="flex items-center gap-2.5">
								{#if item.icon}<item.icon class="size-4.75" strokeWidth={1.9} aria-hidden="true"/>{/if}
                                {item.label}
							</span>
                            {#if item.count}
                                <span class="border border-ink bg-accent px-1.5 text-caps">{item.count}</span>
                            {/if}
                        </a>
                    {/each}
                </nav>
            {/if}

            {#if footer}
                <div class="hidden border-t border-hair px-4 pt-3.5 md:mt-auto md:block">
                    {@render footer()}
                </div>
            {/if}
        </aside>

        <main id="main" tabindex="-1" class="px-3.5 pt-4.5 pb-22 outline-none md:px-7.5 md:pt-6.5">
            <div class="max-w-(--admin-content-max)">{@render children()}</div>
            {#if footer}
                <div class="mt-10 border-t border-hair pt-4 md:hidden">{@render footer()}</div>
            {/if}
        </main>
    </div>
{/if}
