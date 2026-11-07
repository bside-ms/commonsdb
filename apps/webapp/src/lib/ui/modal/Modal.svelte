<!--
	@component
	Dialog on Bits UI: focus trap, Escape, scroll lock, focus return.
	Bottom sheet below `lg`, centred card above (as in the prototype).

	Controlled:
	<Modal bind:open title={m.profile_delete_title()} description={m.profile_delete_text()}>
		{#snippet actions()}
			<Button variant="ghost" onclick={() => (open = false)}>{m.ui_cancel()}</Button>
			<Button tone="danger" type="submit" form="delete-form">{m.profile_delete()}</Button>
		{/snippet}
	</Modal>

	With its own trigger (props carry the aria wiring, spread them):
	<Modal title="…">
		{#snippet trigger(props)}<Button {...props}>Öffnen</Button>{/snippet}
		…
	</Modal>
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Dialog } from 'bits-ui';
	import { X } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { cn } from '../utils.ts';

	type Props = {
		open?: boolean;
		title: string;
		description?: string;
		trigger?: Snippet<[Record<string, unknown>]>;
		/** Buttons row at the bottom; buttons share the width. */
		actions?: Snippet;
		/** Hide the X button, e.g. when the actions already offer a way out. */
		hideClose?: boolean;
		onOpenChange?: (open: boolean) => void;
		class?: string;
		children?: Snippet;
	};

	let {
		open = $bindable(false),
		title,
		description,
		trigger,
		actions,
		hideClose = false,
		onOpenChange,
		class: className,
		children
	}: Props = $props();
</script>

<Dialog.Root bind:open {onOpenChange}>
	{#if trigger}
		<Dialog.Trigger>
			{#snippet child({ props })}{@render trigger(props)}{/snippet}
		</Dialog.Trigger>
	{/if}

	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-(--backdrop)" />
		<Dialog.Content
			class={cn(
				'fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-auto border border-ink bg-paper p-5',
				'lg:inset-auto lg:top-1/2 lg:left-1/2 lg:w-[calc(100%-3rem)] lg:max-w-(--modal-max) lg:-translate-1/2',
				className
			)}
		>
			<div class="flex items-start justify-between gap-4">
				<Dialog.Title class="text-h2">{title}</Dialog.Title>
				{#if !hideClose}
					<Dialog.Close
						class="-mt-1 -mr-1 inline-flex size-(--touch-min) shrink-0 cursor-pointer items-center justify-center hover:bg-hover-strong"
						aria-label={m.ui_close()}
					>
						<X class="size-5" strokeWidth={2} aria-hidden="true" />
					</Dialog.Close>
				{/if}
			</div>

			{#if description}
				<Dialog.Description class="mt-2 text-body">{description}</Dialog.Description>
			{/if}

			{#if children}<div class="mt-4">{@render children()}</div>{/if}

			{#if actions}
				<div class="mt-5 flex flex-wrap gap-2.25 [&>*]:min-w-32 [&>*]:flex-1">
					{@render actions()}
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
