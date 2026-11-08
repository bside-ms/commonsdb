<!--
	@component
	Checkbox with its label beside it. Carries its own hint and error,
	because the FormField layout (label above) doesn't fit a checkbox.
	Native input: posts "on" with plain form actions, no JS needed.

	<Checkbox name="acceptRules" required label={m.onboarding_accept_rules()}
		error={fields.acceptRules && errorMessage(fields.acceptRules)} />
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '#lib/ui';

	type Props = Omit<HTMLInputAttributes, 'type' | 'class' | 'children'> & {
		/** Plain label text, or use the children snippet for rich content (links). */
		label?: string;
		hint?: string;
		error?: string | null | false;
		class?: string;
		children?: Snippet;
	};

	let {
		checked = $bindable(false),
		label,
		hint,
		error,
		id,
		class: className,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const inputId = $derived(id ?? `${uid}-checkbox`);
	const describedBy = $derived(
		[hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined
	);
</script>

<div class={cn('grid content-start gap-1', className)}>
	<div class="flex items-start gap-2.5">
		<input
			{...rest}
			id={inputId}
			type="checkbox"
			bind:checked
			aria-describedby={describedBy}
			aria-invalid={error ? true : undefined}
			class="mt-0.75 size-4.5 shrink-0 cursor-pointer accent-ink aria-invalid:outline-2 aria-invalid:outline-danger"
		/>
		<label for={inputId} class="cursor-pointer text-body">
			{#if children}{@render children()}{:else}{label}{/if}
		</label>
	</div>
	{#if hint}
		<p id="{inputId}-hint" class="pl-7 text-tiny text-muted">{hint}</p>
	{/if}
	{#if error}
		<p id="{inputId}-error" class="pl-7 text-tiny font-semibold text-danger">{error}</p>
	{/if}
</div>
