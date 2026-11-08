<!--
	@component
	Multi-line text. Same wiring as Input.
-->
<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { control, getFieldContext, cn } from '#lib/ui';

	type Props = Omit<HTMLTextareaAttributes, 'class'> & { class?: string };

	let { value = $bindable(), rows = 4, class: className, ...rest }: Props = $props();

	const field = getFieldContext();
</script>

<textarea
	id={field?.id}
	aria-describedby={field?.describedBy}
	aria-invalid={field?.invalid || undefined}
	{...rest}
	{rows}
	bind:value
	class={control({ class: cn('min-h-22 resize-y', className) })}></textarea>
