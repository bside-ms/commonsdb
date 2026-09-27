<script lang="ts">
    import type {Snippet} from 'svelte';

    /**
     * One shell, not two. Member and admin differ by the nav array
     * and the area marker — two shells drift apart within a month.
     */
    type NavItem = { href: string; label: string; badge?: number };

    let {
        area = 'member',
        nav = [],
        current = '',
        title,
        children,
        aside
    }: {
        area?: 'member' | 'admin';
        nav?: NavItem[];
        current?: string;
        title?: string;
        children: Snippet;
        aside?: Snippet;
    } = $props();
</script>

<a
        href="#main"
        class="absolute top-0 left-[-9999px] z-500 bg-ink px-4 py-3 font-semibold text-paper focus:top-2"
>
    Zum Inhalt springen
</a>

<div class="flex min-h-screen flex-col" data-area={area}>
    <header class="flex items-center justify-between gap-[13px] border-b border-ink bg-paper px-4 py-[13px]">
        <div class="flex items-center gap-2.5">
            <span class="font-semibold tracking-[-0.02em]">B-SIDE</span>
            {#if area === 'admin'}<span class="text-tiny text-muted">Verwaltung</span>{/if}
        </div>
        {#if aside}
            <div>{@render aside()}</div>
        {/if}
    </header>

    <nav
            aria-label={area === 'admin' ? 'Verwaltung' : 'Hauptnavigation'}
            class="flex overflow-x-auto border-b border-ink bg-paper max-sm:sticky max-sm:top-0 max-sm:z-10"
    >
        {#each nav as item (item.href)}
            <a
                    href={item.href}
                    aria-current={current === item.href ? 'page' : undefined}
                    class="flex items-center gap-2 border-r border-hair px-4 py-[13px] text-small font-semibold whitespace-nowrap no-underline hover:bg-ghost focus-visible:outline-offset-[-3px] aria-[current=page]:bg-accent"
            >
                {item.label}
                {#if item.badge}
                    <span class="bg-ink px-1.5 py-px text-micro text-paper">{item.badge}</span>
                {/if}
            </a>
        {/each}
    </nav>

    <main id="main" class="mx-auto w-full max-w-4xl flex-1 px-4 pt-5 pb-10">
        {#if title}<h1 class="mb-5">{title}</h1>{/if}
        {@render children()}
    </main>
</div>