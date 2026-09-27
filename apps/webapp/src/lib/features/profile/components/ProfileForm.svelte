<script lang="ts">
    import {Button, Card, Checkbox, FormField, Select, TextInput, Textarea, toast} from '$ui';
    import type {UserResource} from '$lib/api/generated/types.gen';
    import {updateProfile} from '../api/profile.remote';

    let {user}: { user: UserResource } = $props();

    const profile = user.profile;

    let displayName = $state(profile?.displayName ?? '');
    let pronoun = $state(profile?.pronoun ?? '');
    let phone = $state(profile?.phone ?? '');
    let accessibilityNote = $state(profile?.accessibilityNote ?? '');
    let visibility = $state(profile?.visibility ?? 'members');
    let photoVisibility = $state(profile?.photoVisibility ?? 'members');
    let notifyByEmail = $state(profile?.notifyByEmail ?? true);
    let notifyNewTasks = $state(profile?.notifyNewTasks ?? false);

    let pending = $state(false);
    let fields = $state<Record<string, string>>({});

    const visibilityOptions = [
        {value: 'members', label: 'Alle Mitglieder'},
        {value: 'admins', label: 'Nur Leute, die Aufgaben organisieren'}
    ];

    const photoOptions = [
        {value: 'members', label: 'Alle Mitglieder'},
        {value: 'admins', label: 'Nur Leute, die Aufgaben organisieren'},
        {value: 'nobody', label: 'Niemand'}
    ];

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        pending = true;
        fields = {};

        const result = await updateProfile({
            displayName,
            pronoun: pronoun || undefined,
            phone: phone || undefined,
            accessibilityNote: accessibilityNote || undefined,
            visibility: visibility as 'members' | 'admins',
            photoVisibility: photoVisibility as 'members' | 'admins' | 'nobody',
            notifyByEmail,
            notifyNewTasks
        });

        pending = false;

        if (result.ok) {
            toast('Profil gespeichert', {tone: 'accent'});
            return;
        }

        fields = result.fields;
        toast(result.message, {tone: 'danger'});
    }
</script>

<form onsubmit={submit} novalidate class="flex flex-col gap-5">
    <Card>
        <h2 class="mb-4">Über dich</h2>

        <FormField label="Name" error={fields.displayName ?? ''} required>
            {#snippet control(props)}
                <TextInput bind:value={displayName} {...props}/>
            {/snippet}
        </FormField>

        <FormField label="Pronomen" error={fields.pronoun ?? ''}>
            {#snippet control(props)}
                <TextInput bind:value={pronoun} {...props}/>
            {/snippet}
        </FormField>

        <FormField label="Telefon" error={fields.phone ?? ''}>
            {#snippet control(props)}
                <TextInput type="tel" bind:value={phone} {...props}/>
            {/snippet}
        </FormField>

        <FormField
                label="Gibt es etwas, das wir wissen sollten?"
                hint="Nur für Leute sichtbar, die Aufgaben organisieren."
                error={fields.accessibilityNote ?? ''}
        >
            {#snippet control(props)}
                <Textarea bind:value={accessibilityNote} {...props}/>
            {/snippet}
        </FormField>
    </Card>

    <Card>
        <h2 class="mb-4">Sichtbarkeit</h2>

        <FormField label="Wer sieht mein Profil?" error={fields.visibility ?? ''} required>
            {#snippet control(props)}
                <Select bind:value={visibility} options={visibilityOptions} {...props}/>
            {/snippet}
        </FormField>

        <FormField label="Wer sieht mein Foto?" error={fields.photoVisibility ?? ''} required>
            {#snippet control(props)}
                <Select bind:value={photoVisibility} options={photoOptions} {...props}/>
            {/snippet}
        </FormField>
    </Card>

    <Card>
        <h2 class="mb-4">Benachrichtigungen</h2>

        <div class="flex flex-col gap-3">
            <Checkbox bind:checked={notifyByEmail} label="Per E-Mail benachrichtigen"/>
            <Checkbox
                    bind:checked={notifyNewTasks}
                    label="Bei neuen Aufgaben benachrichtigen"
                    hint="Passend zu den Bereichen, die dich interessieren."
            />
        </div>
    </Card>

    <div>
        <Button type="submit" variant="accent" disabled={pending}>
            {pending ? 'Wird gespeichert …' : 'Speichern'}
        </Button>
    </div>
</form>