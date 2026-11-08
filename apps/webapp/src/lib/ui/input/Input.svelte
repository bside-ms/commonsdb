<!--
	@component
	Text-like input. Inside a FormField, id / aria-describedby / aria-invalid
	come from the field; outside one, pass them yourself.
-->
<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { control, getFieldContext } from '#lib/ui';

	type Props = Omit<HTMLInputAttributes, 'type' | 'class'> & {
		type?: 'text' | 'email' | 'tel' | 'password' | 'url' | 'search' | 'number' | 'date' | 'time';
		class?: string;
	};

	let { value = $bindable(), type = 'text', class: className, ...rest }: Props = $props();

	const field = getFieldContext();
</script>

<input
	id={field?.id}
	aria-describedby={field?.describedBy}
	aria-invalid={field?.invalid || undefined}
	{...rest}
	{type}
	bind:value
	class={control({ class: className })}
/>
