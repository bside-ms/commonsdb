<!--
	Create/edit form for a news post, used by /admin/news/new and
	/admin/news/[id]. The body uses the 'news' profile: no headings, the
	title is the heading. "Veröffentlichen" unticked keeps it a draft.
-->
<script lang="ts">
	import type { NewsItem } from '@commonsdb/core';
	import { isAllowedHref, profiles } from '@commonsdb/richtext';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, fieldError as err } from '#lib/i18n/errors.ts';
	import { Button, Checkbox, Editor, FormField, Input } from '#lib/ui';
	import { saveNews } from './news.remote';

	type Props = {
		/** The post to edit; omit to write a new one. */
		item?: NewsItem & { html: string };
		cancelHref: string;
	};

	let { item, cancelHref }: Props = $props();

	const form = $derived(item ? saveNews.for(item.id) : saveNews);
	const f = $derived(form.fields);
</script>

<form {...form} class="grid gap-6">
	{#if item}<input {...f.id.as('hidden', item.id)} />{/if}

	<FormField label={m.news_field_title()} error={err(f.title)}>
		<Input {...f.title.as('text', item?.title ?? '')} maxlength={200} required />
	</FormField>

	<FormField label={m.news_field_body()} hint={m.news_field_body_hint()} error={err(f.body)}>
		<Editor
			name={f.body.as('hidden', '').name}
			value={item?.body ?? null}
			html={item?.html}
			extensions={profiles.news()}
			{isAllowedHref}
		/>
	</FormField>

	<FormField
		label={m.news_field_visible_until()}
		hint={m.news_field_visible_until_hint()}
		optional
		error={err(f.visibleUntil)}
	>
		<Input {...f.visibleUntil.as('date', item?.visibleUntil ?? '')} class="max-w-48" />
	</FormField>

	<div class="grid gap-3">
		<Checkbox
			{...f.pinned.as('checkbox', item?.pinned ?? false)}
			label={m.news_field_pinned()}
			hint={m.news_field_pinned_hint()}
		/>
		<Checkbox
			{...f.published.as('checkbox', item ? item.publishedAt !== null : true)}
			label={m.news_field_published()}
			hint={m.news_field_published_hint()}
		/>
	</div>

	{#each f.issues() ?? [] as issue (issue.message)}
		<p role="alert" class="font-semibold text-danger">{errorMessage(issue.message)}</p>
	{/each}

	<div class="flex flex-wrap gap-3">
		<Button type="submit" disabled={form.pending > 0}>{m.news_save()}</Button>
		<Button variant="ghost" href={cancelHref}>{m.ui_cancel()}</Button>
	</div>
</form>
