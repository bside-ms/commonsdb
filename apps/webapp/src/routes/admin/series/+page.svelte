<!--
	Admin series list: every series in the admin's categories with its rule
	and the next occurrences ("health view"). Members never see this; they
	only see the occurrences, as ordinary tasks.
-->
<script lang="ts">
	import { Plus, Repeat } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { Button, EmptyState } from '#lib/ui';
	import { manageableCategories } from '../tasks/tasks.remote';
	import SeriesCard from './SeriesCard.svelte';
	import { adminSeriesList } from './series.remote';

	const [categories, list] = $derived(
		await Promise.all([manageableCategories(), adminSeriesList()])
	);
	const hasCategories = $derived(categories.length > 0);
</script>

<svelte:head><title>{m.admin_series_title()} · {m.app_name()}</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div class="max-w-2xl">
		<h1>{m.admin_series_title()}</h1>
		<p class="mt-2 text-muted">{m.admin_series_intro()}</p>
	</div>
	{#if hasCategories}
		<Button href={resolve('/admin/series/new')}>
			<Plus class="size-4.5" strokeWidth={2} aria-hidden="true" />
			{m.admin_series_new()}
		</Button>
	{/if}
</div>

{#if !hasCategories}
	<EmptyState
		class="mt-6"
		icon={Repeat}
		title={m.admin_no_capabilities_title()}
		description={m.admin_no_capabilities_hint()}
	/>
{:else if list.length === 0}
	<EmptyState
		class="mt-6"
		icon={Repeat}
		title={m.admin_series_empty_title()}
		description={m.admin_series_empty_hint()}
	/>
{:else}
	<div class="mt-6 grid max-w-3xl gap-4">
		{#each list as series (series.id)}
			<SeriesCard {series} />
		{/each}
	</div>
{/if}
