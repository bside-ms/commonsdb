<script lang="ts">
    import type {Snippet} from 'svelte';
    import type {HTMLAnchorAttributes, HTMLButtonAttributes} from 'svelte/elements';

    type Variant = 'solid' | 'ghost' | 'accent' | 'danger';

    type Props = {
        variant?: Variant;
        size?: 'md' | 'sm';
        block?: boolean;
        href?: string;
        children: Snippet;
    } & HTMLButtonAttributes &
        HTMLAnchorAttributes;

    let {
        variant = 'solid',
        size = 'md',
        block = false,
        href,
        type = 'button',
        disabled = false,
        class: extra = '',
        children,
        ...rest
    }: Props = $props();

    const base =
        'inline-flex items-center justify-center gap-2 edge font-semibold no-underline cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed aria-disabled:opacity-35';

    const variants: Record<Variant, string> = {
        solid: 'bg-ink text-paper hover:bg-black',
        ghost: 'bg-transparent text-ink hover:bg-ghost',
        accent: 'bg-accent text-ink hover:bg-accent-alt',
        danger: 'bg-paper text-danger border-danger hover:bg-danger-soft'
    };

    const sizes = {
        md: 'px-[18px] py-[13px] text-[0.9375rem]',
        sm: 'px-[13px] py-[10px] text-[0.875rem]'
    };

    const cls = $derived(
        [base, variants[variant], sizes[size], block ? 'w-full' : '', extra].join(' ')
    );
</script>

{#if href}
    <a {href} class={cls} aria-disabled={disabled} {...rest}>{@render children()}</a>
{:else}
    <button {type} {disabled} class={cls} {...rest}>{@render children()}</button>
{/if}