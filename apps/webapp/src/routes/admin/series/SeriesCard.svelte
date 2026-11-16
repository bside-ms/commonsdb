<!--
	One series in the list: rule, state, upcoming occurrences, pause and
	resume. Its own component so each card owns its form instances (see
	TaskRow).
-->
<script lang="ts">
	import type { AdminSeriesListItem } from '@commonsdb/core';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { Badge, Button, Card, toast } from '#lib/ui';
	import Occurrences from './Occurrences.svelte';
	import { ruleText } from './rule-text.ts';
	import { pause, resume } from './series.remote';

	let { series }: { series: AdminSeriesListItem } = $props();

	const pauseForm = $derived(pause.for(series.id));
	const resumeForm = $derived(resume.for(series.id));
</script>

<Card>
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<h2 class="text-h3">
				<a href={resolve('/admin/series/[id]', { id: series.id })}>{series.title}</a>
			</h2>
			<p class="mt-0.5 text-small text-muted">
				{ruleText(series.rule)} · {series.category.name}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#if series.state === 'paused'}
				<Badge>{m.admin_series_state_paused()}</Badge>
				<form
					{...resumeForm.enhance(async ({ submit }) => {
						if (await submit()) toast(m.admin_series_resumed_toast());
					})}
				>
					<input {...resumeForm.fields.id.as('hidden', series.id)} />
					<Button type="submit" size="sm" variant="ghost" disabled={resumeForm.pending > 0}>
						{m.admin_series_resume()}
					</Button>
				</form>
			{:else}
				{#if series.state === 'ended'}<Badge>{m.admin_series_state_ended()}</Badge>{/if}
				<form
					{...pauseForm.enhance(async ({ submit }) => {
						if (await submit()) toast(m.admin_series_paused_toast());
					})}
				>
					<input {...pauseForm.fields.id.as('hidden', series.id)} />
					<Button type="submit" size="sm" variant="ghost" disabled={pauseForm.pending > 0}>
						{m.admin_series_pause()}
					</Button>
				</form>
			{/if}
		</div>
	</div>

	<div class="mt-3">
		<Occurrences occurrences={series.upcoming} state={series.state} rule={series.rule} />
	</div>
</Card>
