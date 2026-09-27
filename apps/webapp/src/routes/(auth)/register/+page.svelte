<script lang="ts">
    import {RegisterForm} from '$features/auth';
    import {paths} from '$lib/paths';
</script>

<svelte:head><title>Mitmachen — B-SIDE</title></svelte:head>

<h1 class="mb-2 text-h2">Mitmachen</h1>
<p class="mb-5 text-small text-muted">
    Alles außer Name, E-Mail und Passwort ist freiwillig und lässt sich später ändern.
</p>

<RegisterForm/>

<p class="mt-5 text-small text-muted">
    Schon dabei?
    <a href={paths.signIn} class="font-semibold text-ink underline">Anmelden</a>
</p>