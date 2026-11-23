<!--
	@component
	File picker in the control style. Inside a FormField, id /
	aria-describedby / aria-invalid come from the field. The browser's own
	button stays (it says what it does in the user's language); we only
	style it.

	<FileInput {...fields.image.as('file')} accept="image/jpeg,image/png" />
-->
<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { control, getFieldContext } from '#lib/ui';

	type Props = Omit<HTMLInputAttributes, 'type' | 'class' | 'value'> & { class?: string };

	let { class: className, ...rest }: Props = $props();

	const field = getFieldContext();
</script>

<input
	id={field?.id}
	aria-describedby={field?.describedBy}
	aria-invalid={field?.invalid || undefined}
	{...rest}
	type="file"
	class={control({
		class: [
			'cursor-pointer py-2.5 file:mr-3 file:cursor-pointer file:border file:border-ink file:bg-paper file:px-3 file:py-1.5 file:font-semibold file:text-ink hover:file:bg-hover',
			className
		]
	})}
/>
