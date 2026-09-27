<script lang="ts">
    import {SignInForm} from '$features/auth';
    import {paths} from '$lib/paths';
</script>

<svelte:head><title>Anmelden — B-SIDE</title></svelte:head>

<h1 class="mb-5 text-h2">Anmelden</h1>

<SignInForm/>

<p class="mt-5 text-small text-muted">
    Noch nicht dabei?
    <a href={paths.register} class="font-semibold text-ink underline">Mitmachen</a>
</p>