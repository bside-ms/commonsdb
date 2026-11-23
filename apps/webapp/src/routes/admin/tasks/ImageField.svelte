<!--
	The photo of a task or series template (slice 6c). A plain file input
	inside the form: the photo goes up with "Speichern", without JS too.
	The remote function stores it (core/uploads) and hands core the new
	upload id; `imageId` posts the current one back so it stays.

	With JS, a picked file is previewed right away (an object URL, nothing
	is uploaded before saving).
-->
<script lang="ts">
	import type { RemoteFormFields } from '$app/server';
	import { ACCEPTED_TYPES, MAX_BYTES } from '@commonsdb/media/kinds';
	import { m } from '#lib/paraglide/messages.js';
	import { fieldError as err } from '#lib/i18n/errors.ts';
	import { mediaUrl } from '#lib/media.ts';
	import { Checkbox, FileInput, FormField, Input, Thumb } from '#lib/ui';
	import type { TemplateFormData, TemplateInitial } from './template.ts';

	type Props = {
		fields: RemoteFormFields<TemplateFormData>;
		initial: TemplateInitial;
		/** Placeholder seed of what's being edited; none while creating. */
		seed?: string;
	};

	let { fields: f, initial, seed }: Props = $props();

	let preview = $state<string | null>(null);
	let removing = $state(false);

	function pick(e: Event & { currentTarget: HTMLInputElement }) {
		if (preview) URL.revokeObjectURL(preview);
		const file = e.currentTarget.files?.[0];
		preview = file ? URL.createObjectURL(file) : null;
		if (file) removing = false;
	}

	$effect(() => () => {
		if (preview) URL.revokeObjectURL(preview);
	});

	const current = $derived(initial.imageId ? mediaUrl(initial.imageId, 'thumb') : null);
	const shown = $derived(preview ?? (removing ? null : current));
	const maxMb = MAX_BYTES.image / 1024 / 1024;
</script>

<div class="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
	{#if shown || seed}
		<Thumb seed={seed ?? 'new'} src={shown} alt="" />
	{/if}

	<div class="grid gap-4">
		<input {...f.imageId.as('hidden', initial.imageId)} />

		<FormField
			label={initial.imageId ? m.task_image_replace() : m.task_image()}
			hint={m.task_image_hint({ max: maxMb })}
			error={err(f.image)}
			optional
		>
			<FileInput {...f.image.as('file')} accept={ACCEPTED_TYPES.join(',')} onchange={pick} />
		</FormField>

		{#if initial.imageId && !preview}
			<Checkbox
				{...f.removeImage.as('checkbox')}
				label={m.task_image_remove()}
				onchange={(e: Event) => (removing = (e.currentTarget as HTMLInputElement).checked)}
			/>
		{/if}

		<FormField
			label={m.task_image_alt()}
			hint={m.task_image_alt_hint()}
			error={err(f.imageAlt)}
			optional
		>
			<Input {...f.imageAlt.as('text', initial.imageAlt)} maxlength={200} />
		</FormField>
	</div>
</div>
