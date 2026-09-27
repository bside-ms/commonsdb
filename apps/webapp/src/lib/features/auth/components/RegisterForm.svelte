<script lang="ts">
    import {goto} from '$app/navigation';
    import {Button, Card, Checkbox, FormField, TextInput, Textarea} from '$ui';
    import {paths} from '$lib/paths';
    import {register} from '../api/auth.remote';

    let name = $state('');
    let email = $state('');
    let password = $state('');
    let passwordConfirmation = $state('');
    let pronoun = $state('');
    let phone = $state('');
    let accessibilityNote = $state('');
    let acceptsRules = $state(false);

    let pending = $state(false);
    let message = $state('');
    let fields = $state<Record<string, string>>({});

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        pending = true;
        message = '';
        fields = {};

        const result = await register({
            name,
            email,
            password,
            passwordConfirmation,
            pronoun: pronoun || undefined,
            phone: phone || undefined,
            accessibilityNote: accessibilityNote || undefined,
            acceptsRules: acceptsRules as true
        });

        pending = false;

        if (result.ok) {
            await goto(paths.tasks, {invalidateAll: true});
            return;
        }

        message = result.message;
        fields = result.fields;
    }
</script>

<Card>
    <form onsubmit={submit} novalidate>
        {#if message && Object.keys(fields).length === 0}
            <p class="mb-4 border border-danger bg-danger-soft p-3 text-small text-danger" role="alert">
                {message}
            </p>
        {/if}

        <FormField label="Name" error={fields.name ?? ''} required>
            {#snippet control(props)}
                <TextInput autocomplete="name" bind:value={name} {...props}/>
            {/snippet}
        </FormField>

        <FormField
                label="Pronomen"
                hint="Optional. Zum Beispiel sie/ihr, er/ihm, they/them."
                error={fields.pronoun ?? ''}
        >
            {#snippet control(props)}
                <TextInput bind:value={pronoun} {...props}/>
            {/snippet}
        </FormField>

        <FormField label="E-Mail" error={fields.email ?? ''} required>
            {#snippet control(props)}
                <TextInput type="email" autocomplete="email" bind:value={email} {...props}/>
            {/snippet}
        </FormField>

        <FormField label="Telefon" hint="Optional." error={fields.phone ?? ''}>
            {#snippet control(props)}
                <TextInput type="tel" autocomplete="tel" bind:value={phone} {...props}/>
            {/snippet}
        </FormField>

        <FormField
                label="Gibt es etwas, das wir wissen sollten?"
                hint="Optional. Zum Beispiel, wenn du nicht schwer heben kannst oder bestimmte Schichten nicht gehen. Nur für Leute sichtbar, die Aufgaben organisieren."
                error={fields.accessibilityNote ?? ''}
        >
            {#snippet control(props)}
                <Textarea bind:value={accessibilityNote} {...props}/>
            {/snippet}
        </FormField>

        <FormField label="Passwort" error={fields.password ?? ''} required>
            {#snippet control(props)}
                <TextInput type="password" autocomplete="new-password" bind:value={password} {...props}/>
            {/snippet}
        </FormField>

        <FormField label="Passwort wiederholen" error={fields.passwordConfirmation ?? ''} required>
            {#snippet control(props)}
                <TextInput
                        type="password"
                        autocomplete="new-password"
                        bind:value={passwordConfirmation}
                        {...props}
                />
            {/snippet}
        </FormField>

        <div class="mt-5">
            <Checkbox bind:checked={acceptsRules} label="Ich habe die Hausregeln gelesen."/>
            {#if fields.acceptsRules}
                <p class="mt-1 text-micro font-semibold text-danger">{fields.acceptsRules}</p>
            {/if}
        </div>

        <div class="mt-6">
            <Button type="submit" variant="accent" block disabled={pending}>
                {pending ? 'Wird angelegt …' : 'Mitmachen'}
            </Button>
        </div>
    </form>
</Card>