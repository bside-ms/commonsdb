<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import ActionForm from '../ActionForm.svelte';
	import { leadChoices } from '../actions.remote';

	const people = $derived(await leadChoices());
</script>

<svelte:head><title>{m.admin_actions_new()} · {m.app_name()}</title></svelte:head>

<h1>{m.admin_actions_new()}</h1>

<div class="mt-6 max-w-3xl border border-ink bg-paper p-4 sm:p-6">
	<ActionForm {people} cancelHref={resolve('/admin/actions')} />
</div>
