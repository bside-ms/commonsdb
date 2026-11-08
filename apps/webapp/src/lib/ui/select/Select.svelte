<!--
	@component
	Native <select>, styled. Native on purpose: posts with plain form actions,
	works without JS, and the phone shows its own picker. Reach for Bits UI
	Select/Combobox only when we need search or rich options.

	<Select name="visibility" value={values.visibility} options={[
		{ value: 'members', label: m.visibility_members() },
		{ value: 'admins', label: m.visibility_admins() }
	]} />

	Grouped (renders <optgroup>), e.g. categories under their super category:
	<Select name="categoryId" groups={[{ label: 'Küche', options: [...] }]} />
-->
<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { ChevronDown } from '@lucide/svelte';
	import { control, getFieldContext, cn } from '#lib/ui';

	type Option = { value: string; label: string; disabled?: boolean };
	type Group = { label: string; options: Option[] };

	type Props = Omit<HTMLSelectAttributes, 'class' | 'multiple'> & {
		options?: Option[];
		/** Alternative to `options`: options under <optgroup> labels. */
		groups?: Group[];
		/** Shown as a first, empty option. */
		placeholder?: string;
		class?: string;
	};

	let {
		value = $bindable(),
		options = [],
		groups = [],
		placeholder,
		class: className,
		...rest
	}: Props = $props();

	const field = getFieldContext();
</script>

{#snippet option(o: Option)}
	<option value={o.value} disabled={o.disabled}>{o.label}</option>
{/snippet}

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
			{@render option(o)}
		{/each}
		{#each groups as g (g.label)}
			<optgroup label={g.label}>
				{#each g.options as o (o.value)}
					{@render option(o)}
				{/each}
			</optgroup>
		{/each}
	</select>
	<ChevronDown
		class="pointer-events-none absolute top-1/2 right-3 size-4.5 -translate-y-1/2"
		strokeWidth={2}
		aria-hidden="true"
	/>
</div>
