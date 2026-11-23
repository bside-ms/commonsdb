<!--
	@component
	Rich-text editor (TipTap). Posts its document as JSON through a hidden
	input, so it works in a plain form action. Validate on the server with
	parseRichText() from @commonsdb/richtext, using the same profile.

	<FormField label={m.task_description()} optional error={...}>
		<Editor name="description" value={values.description} extensions={profiles.description()} html={values.descriptionHtml} />
	</FormField>

	`html` (server-rendered, optional) is shown until the editor has
	loaded, and is all that's visible without JavaScript. The hidden input
	is rendered on the server too, so a no-JS save keeps the old content.

	variant="message": a compact editor for chat messages (profile
	`message`): smaller, its own toolbar (no headings, plus strike and code).
	`submitOnEnter`: Enter submits the surrounding form, Shift+Enter makes a
	line break; inside lists and code blocks Enter keeps its usual meaning.
	On touch devices Enter is a new line and only the send button sends.
	Ctrl/Cmd+Enter always sends. Resetting the form clears the editor.
-->
<script lang="ts">
	import { flushSync, untrack } from 'svelte';
	import { Editor, Extension, getSchema, type Extensions, type JSONContent } from '@tiptap/core';
	import {
		Bold,
		Code,
		Heading2,
		Heading3,
		Italic,
		Link,
		List,
		ListOrdered,
		Redo2,
		SquareCode,
		Strikethrough,
		Undo2
	} from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { Button, FormField, Input, Modal, cn, getFieldContext } from '#lib/ui';

	type Props = {
		/** Name of the hidden input that carries the JSON. */
		name: string;
		/** Initial document; also bindable. null = empty. */
		value?: JSONContent | null;
		/** A profile from @commonsdb/richtext, e.g. profiles.description(). */
		extensions: Extensions;
		/** Server-rendered HTML of `value`, shown before the editor loads. */
		html?: string;
		/** Validates a link target before it's set (same rule as the server). */
		isAllowedHref?: (href: string) => boolean;
		/** 'document' (default): long text with headings. 'message': compact, for chats. */
		variant?: 'document' | 'message';
		/** Enter submits the surrounding form (see above). */
		submitOnEnter?: boolean;
		class?: string;
	};

	let {
		name,
		value = $bindable(null),
		extensions,
		html,
		isAllowedHref = () => true,
		variant = 'document',
		submitOnEnter = false,
		class: className
	}: Props = $props();

	const compact = $derived(variant === 'message');

	const field = getFieldContext();

	let element: HTMLDivElement;
	// $state.raw: the editor is a big mutable object we never want proxied.
	let editor = $state.raw<Editor | null>(null);
	// TipTap changes its state internally; bump this to re-read the toolbar.
	let revision = $state(0);
	// The serialised value, kept separately so the hidden input is right from SSR on.
	let json = $state(serialise(value));

	function serialise(doc: JSONContent | null | undefined) {
		return doc ? JSON.stringify(doc) : '';
	}

	// Mount once, in the browser. Effects never run on the server, so
	// TipTap (which needs the DOM) is only touched here.
	$effect(() => {
		// untrack: read the props once. Later changes to `extensions` or
		// `value` must not rebuild the editor (and lose the cursor).
		const [initialExtensions, initialValue, enter, isCompact] = untrack(
			() => [extensions, value, submitOnEnter, compact] as const
		);
		const form = element.closest('form');
		const instance = new Editor({
			element,
			extensions: enter ? [...initialExtensions, enterSends(form)] : initialExtensions,
			content: initialValue ?? '',
			editorProps: {
				attributes: {
					role: 'textbox',
					'aria-multiline': 'true',
					...(field && { 'aria-labelledby': field.labelId, id: field.id }),
					...(field?.describedBy && { 'aria-describedby': field.describedBy }),
					...(field?.invalid && { 'aria-invalid': 'true' }),
					class: cn(
						'prose max-w-none px-3 focus:outline-none',
						isCompact ? 'min-h-16 py-2' : 'min-h-40 py-3'
					)
				}
			},
			onTransaction: () => revision++,
			onUpdate: ({ editor: e }) => {
				const doc = e.isEmpty ? null : e.getJSON();
				value = doc;
				json = serialise(doc);
			}
		});
		editor = instance;

		// form.reset() (e.g. after a successful send) empties the editor too
		const clear = () => instance.commands.clearContent(true);
		form?.addEventListener('reset', clear);
		return () => {
			form?.removeEventListener('reset', clear);
			instance.destroy();
		};
	});

	/** Enter sends, except on touch devices and inside lists or code blocks. */
	function enterSends(form: HTMLFormElement | null) {
		const send = () => {
			flushSync(); // the hidden input must hold the latest JSON before submitting
			form?.requestSubmit();
			return true;
		};
		return Extension.create({
			name: 'enterSends',
			addKeyboardShortcuts() {
				return {
					Enter: ({ editor: e }) => {
						if (matchMedia('(pointer: coarse)').matches) return false;
						if (e.isActive('codeBlock') || e.isActive('listItem')) return false;
						if (e.isEmpty) return true;
						return send();
					},
					'Mod-Enter': ({ editor: e }) => (e.isEmpty ? true : send())
				};
			}
		});
	}

	// Keep aria in sync when the field gets an error after a failed submit.
	$effect(() => {
		const dom = editor?.view.dom;
		if (!dom || !field) return;
		if (field.invalid) dom.setAttribute('aria-invalid', 'true');
		else dom.removeAttribute('aria-invalid');
		if (field.describedBy) dom.setAttribute('aria-describedby', field.describedBy);
		else dom.removeAttribute('aria-describedby');
	});

	/** Is a mark/node active at the cursor? Reads `revision` to stay reactive. */
	function active(type: string, attrs?: Record<string, unknown>) {
		void revision;
		return editor?.isActive(type, attrs) ?? false;
	}

	function can(check: (e: Editor) => boolean) {
		void revision;
		return editor ? check(editor) : false;
	}

	// ---- link dialog ----
	let linkOpen = $state(false);
	let linkHref = $state('');
	let linkError = $state<string | null>(null);

	function openLink() {
		linkHref = editor?.getAttributes('link').href ?? '';
		linkError = null;
		linkOpen = true;
	}

	function applyLink(event: SubmitEvent) {
		event.preventDefault();
		if (!editor) return;
		const raw = linkHref.trim();
		const chain = editor.chain().focus().extendMarkRange('link');
		if (raw === '') {
			chain.unsetLink().run();
			linkOpen = false;
			return;
		}
		// "b-side.ms" → "https://b-side.ms"; mailto:/tel: stay as typed
		const href = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
		if (!isAllowedHref(href)) {
			linkError = m.ui_editor_link_invalid();
			return;
		}
		chain.setLink({ href }).run();
		linkOpen = false;
	}

	type Tool = {
		label: string;
		icon: typeof Bold;
		run: (e: Editor) => void;
		pressed?: () => boolean;
		enabled?: () => boolean;
		/** Node or mark the tool needs; hidden when the profile doesn't have it. */
		needs?: string;
	};

	// What the profile allows, read once like the editor (SSR included), so
	// the toolbar never offers a button the server would reject.
	const schema = untrack(() => getSchema(extensions));
	const available = (t: Tool) => !t.needs || t.needs in schema.nodes || t.needs in schema.marks;

	const bold: Tool = {
		label: m.ui_editor_bold(),
		icon: Bold,
		run: (e) => e.chain().focus().toggleBold().run(),
		pressed: () => active('bold')
	};
	const italic: Tool = {
		label: m.ui_editor_italic(),
		icon: Italic,
		run: (e) => e.chain().focus().toggleItalic().run(),
		pressed: () => active('italic')
	};
	const link: Tool = {
		label: m.ui_editor_link(),
		icon: Link,
		run: openLink,
		pressed: () => active('link')
	};
	const bulletList: Tool = {
		label: m.ui_editor_bullet_list(),
		icon: List,
		run: (e) => e.chain().focus().toggleBulletList().run(),
		pressed: () => active('bulletList')
	};
	const orderedList: Tool = {
		label: m.ui_editor_ordered_list(),
		icon: ListOrdered,
		run: (e) => e.chain().focus().toggleOrderedList().run(),
		pressed: () => active('orderedList')
	};

	const messageGroups: Tool[][] = $derived([
		[
			bold,
			italic,
			{
				label: m.ui_editor_strike(),
				icon: Strikethrough,
				run: (e) => e.chain().focus().toggleStrike().run(),
				pressed: () => active('strike')
			},
			{
				label: m.ui_editor_code(),
				icon: Code,
				run: (e) => e.chain().focus().toggleCode().run(),
				pressed: () => active('code')
			},
			link
		],
		[
			bulletList,
			orderedList,
			{
				label: m.ui_editor_code_block(),
				icon: SquareCode,
				run: (e) => e.chain().focus().toggleCodeBlock().run(),
				pressed: () => active('codeBlock')
			}
		]
	]);

	const documentGroups: Tool[][] = $derived([
		[bold, italic, link],
		[
			{
				label: m.ui_editor_heading2(),
				icon: Heading2,
				run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
				pressed: () => active('heading', { level: 2 }),
				needs: 'heading'
			},
			{
				label: m.ui_editor_heading3(),
				icon: Heading3,
				run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
				pressed: () => active('heading', { level: 3 }),
				needs: 'heading'
			},
			bulletList,
			orderedList
		],
		[
			{
				label: m.ui_editor_undo(),
				icon: Undo2,
				run: (e) => e.chain().focus().undo().run(),
				enabled: () => can((e) => e.can().undo())
			},
			{
				label: m.ui_editor_redo(),
				icon: Redo2,
				run: (e) => e.chain().focus().redo().run(),
				enabled: () => can((e) => e.can().redo())
			}
		]
	]);

	const groups = $derived(
		(compact ? messageGroups : documentGroups)
			.map((group) => group.filter(available))
			.filter((group) => group.length > 0)
	);
</script>

<div
	class={cn(
		'border bg-paper',
		field?.invalid ? 'border-danger' : 'border-ink',
		'focus-within:shadow-(--focus-field)',
		className
	)}
>
	<div
		role="toolbar"
		aria-label={m.ui_editor_toolbar()}
		aria-controls={field?.id}
		class="flex flex-wrap border-b border-ink"
	>
		{#each groups as group, i (i)}
			<div class="flex border-r border-ink last:border-r-0">
				{#each group as tool (tool.label)}
					{@const Icon = tool.icon}
					<button
						type="button"
						title={tool.label}
						aria-label={tool.label}
						aria-pressed={tool.pressed ? tool.pressed() : undefined}
						disabled={!editor || (tool.enabled ? !tool.enabled() : false)}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => editor && tool.run(editor)}
						class="inline-flex size-(--touch-min) shrink-0 cursor-pointer items-center justify-center hover:bg-hover-strong disabled:cursor-not-allowed disabled:opacity-35 aria-pressed:bg-ink aria-pressed:text-paper"
					>
						<Icon class="size-4.5" strokeWidth={2} aria-hidden="true" />
					</button>
				{/each}
			</div>
		{/each}
	</div>

	{#if !editor && html}
		<!-- server-rendered preview until TipTap has mounted; html comes from toHtml() -->
		<div
			class={cn('prose max-w-none px-3 text-muted', compact ? 'min-h-16 py-2' : 'min-h-40 py-3')}
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html html}
		</div>
	{/if}
	<div bind:this={element} class={cn(!editor && 'hidden')}></div>

	<input type="hidden" {name} value={json} />
</div>

<Modal bind:open={linkOpen} title={m.ui_editor_link_title()}>
	<form id="{name}-link-form" onsubmit={applyLink} class="grid gap-4">
		<FormField label={m.ui_editor_link_url()} hint={m.ui_editor_link_hint()} error={linkError}>
			<!-- text, not url: the browser would reject "b-side.ms" before we add https:// -->
			<Input bind:value={linkHref} inputmode="url" placeholder="https://" autocomplete="url" />
		</FormField>
	</form>
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (linkOpen = false)}>{m.ui_cancel()}</Button>
		<Button type="submit" form="{name}-link-form">{m.ui_editor_link_apply()}</Button>
	{/snippet}
</Modal>
