<!--
	An Aktion (e.g. Repro-Arbeitstag) for members: what, when, who to ask,
	and the marked tasks as free / running / done, with who's on them.
	The page people reach from the QR code at the door.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate } from '#lib/format.ts';
	import { Badge, Button, EmptyState } from '#lib/ui';
	import { actionPage } from '../aktion.remote';
	import MemberTaskRow from '#lib/components/MemberTaskRow.svelte';
	import { resolve } from '$app/paths';

	const a = $derived(await actionPage(page.params.id!));

	const free = $derived(a.tasks.filter((t) => t.shifts.free > 0));
	const running = $derived(a.tasks.filter((t) => t.shifts.free === 0 && !t.done));
	const done = $derived(a.tasks.filter((t) => t.shifts.free === 0 && t.done));

	const when = $derived(
		a.startsTime && a.endsTime
			? m.action_when({ date: formatDate(new Date(a.date)), from: a.startsTime, to: a.endsTime })
			: formatDate(new Date(a.date))
	);
	const groups = $derived([
		{ id: 'free', title: m.action_tasks_free(), list: free },
		{ id: 'running', title: m.action_tasks_running(), list: running },
		{ id: 'done', title: m.action_tasks_done(), list: done }
	]);
</script>

<svelte:head><title>{a.title} · {m.app_name()}</title></svelte:head>

<Badge tone="info">{m.action_badge()}</Badge>
<h1 class="mt-2">{a.title}</h1>
<p class="mt-2 font-semibold">{[when, a.place].filter(Boolean).join(' · ')}</p>
{#if a.leads.length}
	<p class="mt-1 text-small text-muted">
		{m.action_leads()}: {a.leads.map((l) => l.name).join(', ')}
	</p>
{/if}
{#if a.html}
	<div class="prose mt-5 max-w-[65ch]">{@html a.html}</div>
{/if}

{#if a.tasks.length === 0}
	<EmptyState class="mt-8" title={m.action_tasks_empty()} />
{:else}
	{#each groups as g (g.id)}
		{#if g.list.length}
			<section class="mt-8" aria-labelledby="{g.id}-heading">
				<h2 id="{g.id}-heading">{g.title} ({g.list.length})</h2>
				<ul class="mt-3 grid border-t border-ink lg:grid-cols-2 lg:gap-x-7">
					{#each g.list as task (task.id)}
						<li class="relative">
							<MemberTaskRow {task} people={task.people} />
							{#if a.canRecordGuests && g.id !== 'done'}
								<div class="pb-3">
									<Button
										size="sm"
										variant="ghost"
										href={resolve('/aktion/[id]/gast/[taskId]', { id: a.id, taskId: task.id })}
									>
										{m.action_record_guest()}
									</Button>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
{/if}
