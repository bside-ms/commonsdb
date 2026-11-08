<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/i18n/errors.ts';
	import { Checkbox, FormField, Input, Select, Textarea } from '#lib/ui';
	import type { ProfileFormValues } from '#lib/server/profile-form.ts';

	let { values, fields = {} }: { values: ProfileFormValues; fields?: Record<string, string> } =
		$props();

	const err = (field: string) => (fields[field] ? errorMessage(fields[field]) : undefined);

	const visibilityOptions = $derived([
		{ value: 'members', label: m.visibility_members() },
		{ value: 'admins', label: m.visibility_admins() }
	]);
	const photoOptions = $derived([
		...visibilityOptions,
		{ value: 'nobody', label: m.visibility_nobody() }
	]);
</script>

<div class="grid gap-5 sm:grid-cols-2">
	<FormField label={m.profile_display_name()} error={err('displayName')}>
		<Input name="displayName" value={values.displayName} autocomplete="name" required />
	</FormField>

	<FormField label={m.profile_pronoun()} error={err('pronoun')} optional>
		<Input name="pronoun" value={values.pronoun} />
	</FormField>

	<FormField label={m.profile_phone()} error={err('phone')} optional>
		<Input name="phone" type="tel" value={values.phone} autocomplete="tel" />
	</FormField>

	<FormField
		class="sm:col-span-2"
		label={m.profile_accessibility_note()}
		hint={m.profile_accessibility_note_hint()}
		error={err('accessibilityNote')}
		optional
	>
		<Textarea name="accessibilityNote" value={values.accessibilityNote} rows={3} />
	</FormField>

	<FormField label={m.profile_visibility()} error={err('visibility')}>
		<Select name="visibility" value={values.visibility} options={visibilityOptions} />
	</FormField>

	<FormField label={m.profile_photo_visibility()} error={err('photoVisibility')}>
		<Select name="photoVisibility" value={values.photoVisibility} options={photoOptions} />
	</FormField>

	<fieldset class="grid gap-2 sm:col-span-2">
		<legend class="mb-2 text-tiny font-semibold">{m.profile_notifications()}</legend>
		<Checkbox
			name="notifyByEmail"
			checked={values.notifyByEmail}
			label={m.profile_notify_by_email()}
		/>
		<Checkbox
			name="notifyNewTasks"
			checked={values.notifyNewTasks}
			label={m.profile_notify_new_tasks()}
		/>
	</fieldset>
</div>
