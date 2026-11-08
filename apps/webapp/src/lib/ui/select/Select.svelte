<!--
	@component
	Native <select>, styled. Native on purpose: posts with plain form actions,
	works without JS, and the phone shows its own picker. Reach for Bits UI
	Select/Combobox only when we need search or rich options.

	<Select name="visibility" value={values.visibility} options={[
		{ value: 'members', label: m.visibility_members() },
		{ value: 'admins', label: m.visibility_admins() }
	]} />
-->
<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { ChevronDown } from '@lucide/svelte';
	import { control, getFieldContext, cn } from '#lib/ui';

	type Option = { value: string; label: string; disabled?: boolean };

	type Props = Omit<HTMLSelectAttributes, 'class' | 'multiple'> & {
		options: Option[];
		/** Shown as a first, empty option. */
		placeholder?: string;
		class?: string;
	};

	let { value = $bindable(), options, placeholder, class: className, ...rest }: Props = $props();

	const field = getFieldContext();
</script>

<div class={cn('relative', className)}>
	<select
		id={field?.id}
		aria-describedby={field?.describedBy}
		aria-invalid={field?.invalid || undefined}
		{...rest}
		bind:value
		class={control({ class: 'cursor-pointer appearance-none pr-10' })}
	>
		{#if placeholder}
			<option value="">{placeholder}</option>
		{/if}
		{#each options as o (o.value)}
			<option value={o.value} disabled={o.disabled}>{o.label}</option>
		{/each}
	</select>
	<ChevronDown
		class="pointer-events-none absolute top-1/2 right-3 size-4.5 -translate-y-1/2"
		strokeWidth={2}
		aria-hidden="true"
	/>
</div>
