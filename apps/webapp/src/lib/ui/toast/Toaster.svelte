<!--
	@component
	Renders the toast queue. Place once in the root +layout.svelte.
	The live region is always in the DOM, so screen readers announce
	toasts that are added later. Danger toasts use role="alert".
-->
<script lang="ts">
	import { X } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { dismiss, toasts } from './toasts.svelte.ts';
</script>

<div
	class="pointer-events-none fixed inset-x-4 bottom-24 z-60 flex flex-col items-center gap-2 lg:bottom-7"
	aria-live="polite"
	role="status"
>
	{#each toasts as t (t.id)}
		<div
			role={t.tone === 'danger' ? 'alert' : undefined}
			class={[
				'pointer-events-auto flex max-w-[92vw] items-center gap-3 border py-3 pr-2 pl-4 text-small font-semibold',
				t.tone === 'danger' ? 'border-danger bg-danger text-paper' : 'border-ink bg-ink text-paper'
			]}
		>
			<span>{t.message}</span>
			<button
				type="button"
				class="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center hover:bg-paper/15"
				aria-label={m.ui_close()}
				onclick={() => dismiss(t.id)}
			>
				<X class="size-4" strokeWidth={2} aria-hidden="true" />
			</button>
		</div>
	{/each}
</div>
