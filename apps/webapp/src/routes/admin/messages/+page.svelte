<!--
	The shared admin inbox. Filters live in the URL (?tab, ?scope, ?q,
	?sort), like the task list. Default: open threads in the admin's own
	categories (threads without a task always show).

	Several at once: tick, then archive / bring back / delete. Deleting
	only removes it for admins; the member keeps their copy. It asks first.
-->
<script lang="ts">
	import { Inbox } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { AdminInboxTab } from '@commonsdb/core';
	import { m } from '#lib/paraglide/messages.js';
	import { formatStamp } from '#lib/format.ts';
	import { Badge, Button, Card, Chip, EmptyState, FormField, Input, Modal, toast } from '#lib/ui';
	import { adminInbox, bulk, hasOwnScope } from './messages.remote';

	const params = $derived(page.url.searchParams);
	const tabs = ['open', 'unclaimed', 'mine', 'archive'] as const;
	const tab = $derived(
		(tabs as readonly string[]).includes(params.get('tab') ?? '')
			? (params.get('tab') as AdminInboxTab)
			: 'open'
	);
	const scope = $derived(params.get('scope') === 'all' ? 'all' : 'mine');
	const sort = $derived(params.get('sort') === 'waiting' ? 'waiting' : 'recent');
	const q = $derived(params.get('q') ?? '');

	const [{ threads, counts }, ownScope] = $derived(
		await Promise.all([adminInbox({ tab, scope, q, sort }), hasOwnScope()])
	);

	const tabLabel: Record<AdminInboxTab, () => string> = {
		open: m.admin_messages_tab_open,
		unclaimed: m.admin_messages_tab_unclaimed,
		mine: m.admin_messages_tab_mine,
		archive: m.admin_messages_tab_archive
	};

	/** Same filters, one parameter changed. */
	const hrefWith = (key: string, value: string | null) => {
		// a throwaway copy per link, not reactive state
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const next = new URLSearchParams(page.url.search);
		if (value === null) next.delete(key);
		else next.set(key, value);
		const s = next.toString();
		return s ? `?${s}` : resolve('/admin/messages');
	};

	// selection for the bulk actions: the form's own field state
	const selected = $derived(bulk.fields.ids.value() ?? []);
	const allSelected = $derived(threads.length > 0 && selected.length === threads.length);
	let deleteOpen = $state(false);
	const bulkFormId = $props.id();
</script>

<svelte:head><title>{m.admin_messages_title()} · {m.app_name()}</title></svelte:head>

<h1>{m.admin_messages_title()}</h1>
<p class="mt-3 max-w-prose text-small text-muted">{m.admin_messages_intro()}</p>

<nav class="mt-6 flex flex-wrap gap-2" aria-label={m.admin_messages_tabs()}>
	{#each tabs as t (t)}
		<Chip href={hrefWith('tab', t === 'open' ? null : t)} pressed={tab === t}>
			{tabLabel[t]()} ({counts[t]})
		</Chip>
	{/each}
</nav>

<!-- GET form: submitting just changes the URL -->
<form method="get" data-sveltekit-reset="false" class="mt-4 flex flex-wrap items-end gap-3">
	{#if tab !== 'open'}<input type="hidden" name="tab" value={tab} />{/if}
	{#if scope === 'all'}<input type="hidden" name="scope" value="all" />{/if}
	<FormField label={m.admin_messages_search()} class="min-w-48 flex-1">
		<Input type="search" name="q" value={q} placeholder={m.admin_messages_search_placeholder()} />
	</FormField>
	<FormField label={m.admin_messages_sort()} class="min-w-40">
		<select
			name="sort"
			class="h-(--touch-min) border border-ink bg-paper px-3"
			onchange={(e) => e.currentTarget.form?.requestSubmit()}
		>
			<option value="recent" selected={sort === 'recent'}>{m.admin_messages_sort_recent()}</option>
			<option value="waiting" selected={sort === 'waiting'}
				>{m.admin_messages_sort_waiting()}</option
			>
		</select>
	</FormField>
	<Button type="submit" variant="ghost">{m.admin_tasks_filter()}</Button>
</form>

{#if ownScope}
	<p class="mt-3 flex flex-wrap items-center gap-2 text-small">
		<Chip href={hrefWith('scope', null)} pressed={scope === 'mine'}>
			{m.admin_messages_scope_mine()}
		</Chip>
		<Chip href={hrefWith('scope', 'all')} pressed={scope === 'all'}>
			{m.admin_messages_scope_all()}
		</Chip>
	</p>
{/if}

{#if threads.length === 0}
	<EmptyState
		class="mt-6"
		icon={Inbox}
		title={q ? m.admin_messages_no_match() : m.admin_messages_empty()}
	/>
{:else}
	<form
		id={bulkFormId}
		{...bulk.enhance(async ({ submit }) => {
			deleteOpen = false;
			if (await submit()) {
				const r = bulk.result;
				if (r) toast(m.admin_messages_bulk_done({ count: r.count }));
				bulk.fields.ids.set([]);
			}
		})}
		class="mt-6"
	>
		<div
			class="mb-3 flex flex-wrap items-center gap-2"
			role="group"
			aria-label={m.admin_messages_bulk()}
		>
			<span class="mr-auto text-small text-muted">
				{selected.length
					? m.admin_messages_selected({ count: selected.length })
					: m.admin_messages_select_hint()}
			</span>
			{#if tab === 'archive'}
				<Button {...bulk.fields.action.as('submit', 'unarchive')} size="sm" variant="ghost">
					{m.admin_messages_unarchive()}
				</Button>
			{:else}
				<Button {...bulk.fields.action.as('submit', 'archive')} size="sm" variant="ghost">
					{m.admin_messages_archive()}
				</Button>
			{/if}
			<Button
				type="button"
				size="sm"
				variant="ghost"
				tone="danger"
				disabled={selected.length === 0}
				onclick={() => (deleteOpen = true)}
			>
				{m.admin_messages_delete()}
			</Button>
		</div>

		<Card padded={false}>
			<table class="w-full text-left">
				<thead class="border-b border-ink text-small">
					<tr>
						<th scope="col" class="w-10 px-3 py-2">
							<input
								type="checkbox"
								class="size-4.5 accent-ink"
								aria-label={m.admin_messages_select_all()}
								checked={allSelected}
								onchange={(e) =>
									bulk.fields.ids.set(e.currentTarget.checked ? threads.map((t) => t.id) : [])}
							/>
						</th>
						<th scope="col" class="px-3 py-2">{m.admin_messages_col_subject()}</th>
						<th scope="col" class="hidden px-3 py-2 md:table-cell">
							{m.admin_messages_col_from()}
						</th>
						<th scope="col" class="hidden px-3 py-2 md:table-cell">
							{m.admin_messages_col_claimed()}
						</th>
						<th scope="col" class="px-3 py-2 text-right">{m.admin_messages_col_last()}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-hair">
					{#each threads as t (t.id)}
						<tr class={t.unread > 0 ? 'font-semibold' : ''}>
							<td class="px-3 py-2.5 align-top">
								<input
									{...bulk.fields.ids.as('checkbox', t.id)}
									class="size-4.5 accent-ink"
									aria-label={m.admin_messages_select({ subject: t.subject ?? '' })}
								/>
							</td>
							<td class="px-3 py-2.5 align-top">
								<a href={resolve('/admin/messages/[id]', { id: t.id })}>
									{t.subject || m.messages_to_admins()}
								</a>
								{#if t.unread > 0}
									<Badge tone="attention" class="ml-2"
										>{m.messages_unread({ count: t.unread })}</Badge
									>
								{/if}
								{#if t.task}
									<span class="block text-small font-normal text-muted">{t.task.title}</span>
								{/if}
								<span class="block text-small font-normal text-muted md:hidden">
									{t.member?.name}
								</span>
							</td>
							<td class="hidden px-3 py-2.5 align-top font-normal md:table-cell">
								{t.member?.name ?? '–'}
							</td>
							<td class="hidden px-3 py-2.5 align-top font-normal md:table-cell">
								{t.claimedBy?.name ?? '–'}
							</td>
							<td class="px-3 py-2.5 text-right align-top text-small font-normal text-muted">
								{formatStamp(t.lastMessageAt)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</Card>
	</form>

	<Modal
		bind:open={deleteOpen}
		title={m.admin_messages_delete_title({ count: selected.length })}
		description={m.admin_messages_delete_text()}
	>
		{#snippet actions()}
			<Button variant="ghost" onclick={() => (deleteOpen = false)}>{m.ui_cancel()}</Button>
			<Button {...bulk.fields.action.as('submit', 'delete')} form={bulkFormId} tone="danger">
				{m.admin_messages_delete_confirm()}
			</Button>
		{/snippet}
	</Modal>
{/if}
