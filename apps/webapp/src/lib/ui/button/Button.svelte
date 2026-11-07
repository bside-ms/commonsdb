<!--
	@component
	Button, or a link styled as one when `href` is set.

	<Button>Speichern</Button>
	<Button variant="ghost" size="sm" href={resolve('/profile/edit')}>{m.profile_edit()}</Button>
	<Button tone="danger" variant="ghost">Löschen</Button>
-->
<script lang="ts">
    import type {HTMLAnchorAttributes, HTMLButtonAttributes} from 'svelte/elements';
    import {button, type ButtonVariants} from '#lib/ui';

    type Props = ButtonVariants &
        Omit<HTMLButtonAttributes, 'class'> & {
        href?: HTMLAnchorAttributes['href'];
        class?: string;
    };

    let {
        variant,
        size,
        tone,
        block,
        href,
        type = 'button',
        class: className,
        children,
        ...rest
    }: Props = $props();

    const classes = $derived(button({variant, size, tone, block, class: className}));
</script>

{#if href}
    <a {href} class={classes} {...rest as HTMLAnchorAttributes}>{@render children?.()}</a>
{:else}
    <button {type} class={classes} {...rest}>{@render children?.()}</button>
{/if}
