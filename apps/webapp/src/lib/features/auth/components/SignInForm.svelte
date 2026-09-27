<script lang="ts">
    import {goto} from '$app/navigation';
    import {Button, Card, FormField, TextInput} from '$ui';
    import {paths} from '$lib/paths';
    import {signIn} from '../api/auth.remote';

    let email = $state('');
    let password = $state('');

    let pending = $state(false);
    let message = $state('');
    let fields = $state<Record<string, string>>({});

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        pending = true;
        message = '';
        fields = {};

        const result = await signIn({email, password});

        pending = false;

        if (result.ok) {
            // invalidateAll so the (app) layout re-loads the user.
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

        <FormField label="E-Mail" error={fields.email ?? ''} required>
            {#snippet control(props)}
                <TextInput type="email" autocomplete="email" bind:value={email} {...props}/>
            {/snippet}
        </FormField>

        <FormField label="Passwort" error={fields.password ?? ''} required>
            {#snippet control(props)}
                <TextInput
                        type="password"
                        autocomplete="current-password"
                        bind:value={password}
                        {...props}
                />
            {/snippet}
        </FormField>

        <div class="mt-6">
            <Button type="submit" variant="accent" block disabled={pending}>
                {pending ? 'Wird geprüft …' : 'Anmelden'}
            </Button>
        </div>
    </form>
</Card>