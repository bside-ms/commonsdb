<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { manageableCategories } from '../tasks.remote';
	import TaskForm from '../TaskForm.svelte';

	const categories = $derived(await manageableCategories());
</script>

<svelte:head><title>{m.admin_task_new_title()} · {m.app_name()}</title></svelte:head>

<h1>{m.admin_task_new_title()}</h1>

<div class="mt-6 max-w-3xl border border-ink bg-paper p-4 sm:p-6">
	<TaskForm {categories} cancelHref={resolve('/admin/tasks')} />
</div>
