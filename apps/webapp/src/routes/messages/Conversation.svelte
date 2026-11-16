<!--
	@component
	One conversation, for members (/messages/[id]) and admins
	(/admin/messages/[id]): messages oldest first, own ones on the right,
	then the reply box (Enter sends, Shift+Enter is a new line).

	Members also get "remove from my inbox" and, in direct conversations,
	"block this person" (confirmed in a modal; the button is a real submit
	button, the modal only an enhancement). Admins reading an admin thread
	get "Ich kümmere mich" and archive instead.

	System messages (send-back, confirmation) carry a translated headline
	and the admin's note, if any.
-->
<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { isAllowedHref, profiles } from '@commonsdb/richtext';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError } from '#lib/i18n/errors.ts';
	import { formatStamp } from '#lib/format.ts';
	import { Button, Editor, FormField, Modal, RichText, toast } from '#lib/ui';
	import { bulk, claim } from '../admin/messages/messages.remote';
	import { block, hide, retract, sendReply, thread } from './messages.remote';
	import { kindLabel, threadTitle } from './thread-title.ts';

	type Props = {
		id: string;
		/** Where "back" goes: the member or the admin inbox. */
		backHref: string;
	};
	let { id, backHref }: Props = $props();

	const t = $derived(await thread(id));
	const names = $derived(t.others.map((p) => p.name));
	const title = $derived(threadTitle({ ...t, others: names }));
	const label = $derived(kindLabel(t.kind));

	const replyForm = $derived(sendReply.for(t.id));
	const bodyName = $derived(replyForm.fields.body.as('hidden', '').name);
	const hideForm = $derived(hide.for(t.id));

	/** The other person of a direct conversation: the one who can be blocked. */
	const other = $derived(t.kind === 'direct' ? t.others[0] : undefined);
	const blockForm = $derived(block.for(other?.id ?? ''));
	let blockOpen = $state(false);
	const blockFormId = $props.id();

	const info = $derived.by(() => {
		if (t.kind === 'task') return m.messages_info_task();
		if (t.kind === 'group') return m.messages_info_group({ names: names.join(', ') });
		if (t.kind === 'admin' && !t.asAdmin) {
			return t.claimedBy
				? m.messages_info_admin_claimed({ name: t.claimedBy.name })
				: m.messages_info_admin();
		}
		if (t.kind === 'admin' && t.member) return m.messages_info_admin_from({ name: t.member.name });
		return null;
	});

	const systemHeadline = {
		shift_sent_back: m.messages_system_shift_sent_back,
		shift_confirmed: m.messages_system_shift_confirmed
	};
	/** System messages without a note have an empty paragraph as body. */
	const hasText = (html: string) => html.replace(/<p><\/p>/g, '').trim() !== '';

	// admin controls
	const claimForm = $derived(claim.for(t.id));
	const archiveForm = $derived(bulk.for(t.id));
</script>

<svelte:head><title>{title} · {m.app_name()}</title></svelte:head>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- backHref comes resolved from the page -->
<a href={backHref} class="inline-flex items-center gap-1.5 text-small font-semibold">
	<ArrowLeft class="size-4" strokeWidth={2} aria-hidden="true" />
	{m.messages_back()}
</a>

{#if label}<p class="mt-4 text-small font-semibold text-muted">{label}</p>{/if}
<h1 class={label ? 'mt-1' : 'mt-4'}>{title}</h1>
{#if info}<p class="mt-2 max-w-prose text-small text-muted">{info}</p>{/if}
{#if t.task}
	<p class="mt-1 text-small">
		<a href={resolve('/tasks/[id]', { id: t.task.id })}
			>{m.messages_to_task({ title: t.task.title })}</a
		>
	</p>
{/if}

{#if t.asAdmin}
	<div class="mt-4 flex max-w-3xl flex-wrap items-center gap-2 border border-ink bg-canvas p-3">
		<p class="mr-auto text-small">
			{#if t.claimedByMe}
				<strong>{m.admin_messages_claimed_by_me()}</strong>
			{:else if t.claimedBy}
				{m.admin_messages_claimed_by({ name: t.claimedBy.name })}
			{:else}
				{m.admin_messages_unclaimed()}
			{/if}
		</p>
		<form {...claimForm}>
			<input {...claimForm.fields.threadId.as('hidden', t.id)} />
			<Button
				{...claimForm.fields.claim.as('submit', t.claimedByMe ? 'release' : 'take')}
				size="sm"
				variant={t.claimedByMe ? 'ghost' : 'primary'}
			>
				{t.claimedByMe ? m.admin_messages_release() : m.admin_messages_claim()}
			</Button>
		</form>
		<form {...archiveForm}>
			<input {...archiveForm.fields.ids.as('checkbox', t.id, true)} hidden />
			<Button
				{...archiveForm.fields.action.as('submit', t.archived ? 'unarchive' : 'archive')}
				size="sm"
				variant="ghost"
			>
				{t.archived ? m.admin_messages_unarchive() : m.admin_messages_archive()}
			</Button>
		</form>
	</div>
	{#if t.archived}
		<p class="mt-2 max-w-3xl text-small text-muted">{m.admin_messages_archived_hint()}</p>
	{/if}
{/if}

<ol class="mt-6 grid max-w-3xl gap-3" aria-label={m.messages_list_label()}>
	{#each t.messages as msg (msg.id)}
		<li
			class={[
				'grid max-w-[85%] gap-1 border border-ink px-3.5 py-2.5',
				msg.system
					? 'justify-self-center bg-canvas'
					: msg.own
						? 'justify-self-end bg-area-start'
						: 'justify-self-start bg-paper'
			]}
		>
			<p class="text-tiny text-muted">
				<span class="font-semibold text-ink">
					{msg.system
						? m.messages_system()
						: msg.own
							? m.messages_you()
							: (msg.author?.name ?? m.messages_someone())}
				</span>
				· <time datetime={msg.createdAt.toISOString()}>{formatStamp(msg.createdAt)}</time>
			</p>
			{#if msg.system}
				<p class="font-semibold">{systemHeadline[msg.system]()}</p>
			{/if}
			{#if msg.retracted}
				<p class="text-small text-muted italic">{m.messages_retracted()}</p>
			{:else if !msg.system || hasText(msg.html)}
				<RichText html={msg.html} />
			{/if}
			{#if msg.own && !msg.retracted}
				{@const f = retract.for(msg.id)}
				<form {...f} class="justify-self-end">
					<input {...f.fields.messageId.as('hidden', msg.id)} />
					<button
						type="submit"
						class="cursor-pointer text-tiny text-muted underline underline-offset-2 hover:text-ink"
					>
						{m.messages_retract()}
					</button>
				</form>
			{/if}
		</li>
	{/each}
</ol>

{#if t.canReply}
	<form
		{...replyForm.enhance(async ({ element, submit }) => {
			if (await submit()) element.reset();
		})}
		class="mt-6 grid max-w-3xl gap-3"
	>
		<input {...replyForm.fields.threadId.as('hidden', t.id)} />
		<FormField
			label={m.messages_reply()}
			hint={m.messages_reply_hint()}
			error={fieldError(replyForm.fields.body)}
		>
			<Editor
				name={bodyName}
				extensions={profiles.message()}
				variant="message"
				submitOnEnter
				{isAllowedHref}
			/>
		</FormField>
		{#each replyForm.fields.issues() ?? [] as issue (issue.message)}
			<p role="alert" class="text-small font-semibold text-danger">
				{errorMessage(issue.message)}
			</p>
		{/each}
		<div>
			<Button type="submit" disabled={replyForm.pending > 0}>{m.messages_send()}</Button>
		</div>
	</form>
{:else}
	<p role="status" class="mt-6 max-w-3xl border-l-4 border-accent pl-3 text-small">
		{m.messages_cannot_reply()}
	</p>
{/if}

{#if !t.asAdmin}
	<div class="mt-10 flex max-w-3xl flex-wrap gap-2 border-t border-hair pt-4">
		<form {...hideForm}>
			<input {...hideForm.fields.threadId.as('hidden', t.id)} />
			<Button type="submit" size="sm" variant="ghost">{m.messages_hide()}</Button>
		</form>
		{#if other}
			<form
				id={blockFormId}
				{...blockForm.enhance(async ({ submit }) => {
					blockOpen = false;
					if (await submit()) toast(m.messages_blocked_toast({ name: other.name }));
				})}
			>
				<input {...blockForm.fields.userId.as('hidden', other.id)} />
				<Button
					type="submit"
					size="sm"
					variant="ghost"
					tone="danger"
					onclick={(e) => {
						e.preventDefault();
						blockOpen = true;
					}}
				>
					{m.messages_block()}
				</Button>
			</form>
		{/if}
	</div>
{/if}

{#if other}
	<Modal
		bind:open={blockOpen}
		title={m.messages_block_confirm_title({ name: other.name })}
		description={m.messages_block_confirm_text({ name: other.name })}
	>
		{#snippet actions()}
			<Button variant="ghost" onclick={() => (blockOpen = false)}>{m.ui_cancel()}</Button>
			<Button type="submit" form={blockFormId} tone="danger">{m.messages_block()}</Button>
		{/snippet}
	</Modal>
{/if}
