<script lang="ts">
    import {m} from '#lib/paraglide/messages.js';
    import {errorMessage} from '#lib/i18n/errors.ts';
    import type {ProfileFormValues} from '#lib/server/profile-form.ts';

    let {values, fields = {}}: { values: ProfileFormValues; fields?: Record<string, string> } =
        $props();

    const visibilityOptions = [
        {value: 'members', label: m.visibility_members},
        {value: 'admins', label: m.visibility_admins}
    ];
    const photoOptions = [...visibilityOptions, {value: 'nobody', label: m.visibility_nobody}];
</script>

{#snippet error(field: string)}
    {#if fields[field]}<span class="text-sm text-red-700">{errorMessage(fields[field])}</span>{/if}
{/snippet}

<label class="grid gap-1">
    {m.profile_display_name()}
    <input name="displayName" value={values.displayName} required/>
    {@render error('displayName')}
</label>

<label class="grid gap-1">
    {m.profile_pronoun()}
    <input name="pronoun" value={values.pronoun}/>
    {@render error('pronoun')}
</label>

<label class="grid gap-1">
    {m.profile_phone()}
    <input name="phone" type="tel" value={values.phone}/>
    {@render error('phone')}
</label>

<label class="grid gap-1">
    {m.profile_accessibility_note()}
    <span class="text-sm">{m.profile_accessibility_note_hint()}</span>
    <textarea name="accessibilityNote" rows="3">{values.accessibilityNote}</textarea>
    {@render error('accessibilityNote')}
</label>

<label class="grid gap-1">
    {m.profile_visibility()}
    <select name="visibility">
        {#each visibilityOptions as o (o.value)}
            <option value={o.value} selected={values.visibility === o.value}>{o.label()}</option>
        {/each}
    </select>
    {@render error('visibility')}
</label>

<label class="grid gap-1">
    {m.profile_photo_visibility()}
    <select name="photoVisibility">
        {#each photoOptions as o (o.value)}
            <option value={o.value} selected={values.photoVisibility === o.value}>{o.label()}</option>
        {/each}
    </select>
    {@render error('photoVisibility')}
</label>

<fieldset class="grid gap-1">
    <legend>{m.profile_notifications()}</legend>
    <label><input type="checkbox" name="notifyByEmail" checked={values.notifyByEmail}/> {m.profile_notify_by_email()}
    </label>
    <label><input type="checkbox" name="notifyNewTasks" checked={values.notifyNewTasks}/> {m.profile_notify_new_tasks()}
    </label>
</fieldset>