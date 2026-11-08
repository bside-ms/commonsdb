<!--
	Dev-only showcase of lib/ui. Compare against the design canvas.
	Sample copy here is hardcoded on purpose: this page is tooling, not product UI.
-->
<script lang="ts">
	import { Inbox } from '@lucide/svelte';
	import {
		Avatar,
		Badge,
		Button,
		Card,
		Checkbox,
		Chip,
		EmptyState,
		FormField,
		Input,
		Modal,
		Select,
		Textarea,
		Editor,
		RichText,
		toast
	} from '#lib/ui';
	import { enhance } from '$app/forms';
	import { isAllowedHref, profiles } from '@commonsdb/richtext';

	let category = $state('alle');
	let range = $state('heute');
	let modalOpen = $state(false);

	let fontSize = $state<'m' | 'l' | 'xl'>('m');
	$effect(() => {
		const html = document.documentElement;
		if (fontSize === 'm') delete html.dataset.fontSize;
		else html.dataset.fontSize = fontSize;
	});

	let { data, form } = $props();
</script>

<main class="mx-auto grid max-w-(--content-max) gap-10 px-4 py-8 lg:px-10">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<h1>UI</h1>
		<div class="flex border border-ink" role="group" aria-label="Schriftgröße">
			{#each ['m', 'l', 'xl'] as const as s (s)}
				<button
					type="button"
					aria-pressed={fontSize === s}
					onclick={() => (fontSize = s)}
					class="border-l border-ink px-3.5 py-2 font-semibold first:border-l-0 aria-pressed:bg-ink aria-pressed:text-paper"
					>{s.toUpperCase()}</button
				>
			{/each}
		</div>
	</header>

	<section class="grid gap-4 border-t border-ink pt-6">
		<h2>Button</h2>
		<div class="flex flex-wrap items-center gap-3">
			<Button>Übernehmen</Button>
			<Button variant="ghost">Abbrechen</Button>
			<Button variant="accent">Erledigt melden</Button>
			<Button variant="ghost" tone="danger">Löschen</Button>
			<Button tone="danger">Endgültig löschen</Button>
			<Button size="sm">Klein</Button>
			<Button size="sm" variant="ghost">Bearbeiten</Button>
			<Button href="#top" variant="ghost">Als Link</Button>
			<Button disabled>Deaktiviert</Button>
		</div>
		<Button block>Block</Button>
	</section>

	<section class="grid gap-5 border-t border-ink pt-6 sm:grid-cols-3">
		<h2 class="sm:col-span-3">Formular</h2>
		<FormField label="Name" hint="So sehen dich andere Mitglieder.">
			<Input name="name" placeholder="Vor- und Nachname" />
		</FormField>
		<FormField label="Pronomen" optional>
			<Input name="pronoun" />
		</FormField>
		<FormField label="Telefon" error="Bitte eine gültige Nummer eingeben.">
			<Input name="phone" type="tel" value="01" />
		</FormField>
		<FormField label="Sichtbarkeit">
			<Select
				name="visibility"
				placeholder="Bitte wählen"
				options={[
					{ value: 'members', label: 'Alle Mitglieder' },
					{ value: 'admins', label: 'Nur Admins' }
				]}
			/>
		</FormField>
		<FormField class="sm:col-span-2" label="Hinweis" optional>
			<Textarea name="note" />
		</FormField>
		<div class="grid gap-3 sm:col-span-3">
			<Checkbox name="a" label="Ich habe die Hausregeln gelesen und akzeptiere sie." />
			<Checkbox name="b" label="Mit Fehler" error="Bitte akzeptiere die Hausregeln." />
			<Checkbox name="c" label="Deaktiviert" disabled />
		</div>
	</section>

	<section class="grid gap-4 border-t border-ink pt-6">
		<h2>Chip · Badge</h2>
		<div class="flex flex-wrap gap-2">
			{#each ['alle', 'bar', 'technik', 'garten'] as c (c)}
				<Chip pressed={category === c} onclick={() => (category = c)}>{c}</Chip>
			{/each}
		</div>
		<div class="flex flex-wrap gap-2">
			{#each ['heute', 'woche'] as r (r)}
				<Chip size="sub" pressed={range === r} onclick={() => (range = r)}>{r}</Chip>
			{/each}
		</div>
		<div class="flex flex-wrap gap-2">
			<Badge>Entwurf</Badge>
			<Badge tone="attention">Dringend</Badge>
			<Badge tone="success">Bestätigt</Badge>
			<Badge tone="info">Gemeldet</Badge>
			<Badge outline>Outline</Badge>
		</div>
	</section>

	<section class="grid gap-4 border-t border-ink pt-6 lg:grid-cols-2">
		<h2 class="lg:col-span-2">Card · Avatar · EmptyState</h2>
		<Card title="Zu bestätigen">
			{#snippet actions()}
				<Button size="sm" variant="ghost">Alle ansehen</Button>
			{/snippet}
			<p class="text-small">Card mit Kopfzeile. Ohne `title` ist es eine schlichte Box.</p>
		</Card>
		<div class="grid gap-4">
			<div class="flex flex-wrap items-center gap-3">
				<Avatar name="Kim Meyer" size="sm" />
				<Avatar name="Jo Schulte" />
				<Avatar name="Alex Lange" color="area-tasks" />
				<Avatar name="Tönnies Öztürk" size="lg" />
				<Avatar name="Broken Image" src="/does-not-exist.jpg" />
			</div>
			<EmptyState
				icon={Inbox}
				title="Keine offenen Aufgaben"
				description="Schau später wieder vorbei oder ändere den Filter."
			>
				{#snippet action()}
					<Button size="sm" variant="ghost">Filter zurücksetzen</Button>
				{/snippet}
			</EmptyState>
		</div>
	</section>

	<section class="grid gap-4 border-t border-ink pt-6">
		<h2>Modal · Toast</h2>
		<div class="flex flex-wrap gap-3">
			<Button onclick={() => (modalOpen = true)}>Modal öffnen</Button>
			<Modal title="Mit Trigger-Snippet" description="Der Trigger bringt seine aria-Attribute mit.">
				{#snippet trigger(props)}
					<Button variant="ghost" {...props}>Trigger</Button>
				{/snippet}
			</Modal>
			<Button variant="ghost" onclick={() => toast('Aufgabe übernommen.')}>Toast</Button>
			<Button
				variant="ghost"
				tone="danger"
				onclick={() => toast('Das hat nicht geklappt.', { tone: 'danger' })}
				>Fehler-Toast
			</Button>
		</div>
		<Modal
			bind:open={modalOpen}
			title="Aufgabe übernehmen?"
			description="Du trägst dich für Sa 14.11., 22–24 Uhr ein. Du kannst sie bis zum Vortag wieder freigeben."
		>
			{#snippet actions()}
				<Button variant="ghost" onclick={() => (modalOpen = false)}>Abbrechen</Button>
				<Button
					onclick={() => {
						modalOpen = false;
						toast('Aufgabe übernommen.');
					}}
					>Übernehmen
				</Button>
			{/snippet}
		</Modal>
	</section>

	<section class="grid gap-4 border-t border-ink pt-6 lg:grid-cols-2">
		<h2 class="lg:col-span-2">Editor · RichText</h2>

		<form method="post" action="?/richtext" use:enhance class="grid content-start gap-3">
			<FormField label="Beschreibung" optional hint="Absenden zeigt, was der Server daraus macht.">
				<Editor
					name="description"
					value={data.richText.doc}
					html={data.richText.html}
					extensions={profiles.description()}
					{isAllowedHref}
				/>
			</FormField>
			<div>
				<Button type="submit" size="sm">Absenden</Button>
			</div>
		</form>

		<div class="grid content-start gap-3">
			<p class="text-caps uppercase">Server-HTML</p>
			{#if form?.richText && !form.richText.ok}
				<p class="font-semibold text-danger">Abgelehnt: {form.richText.reason}</p>
			{:else}
				<RichText
					html={form?.richText?.html ?? data.richText.html}
					class="border border-ink bg-paper p-4"
				/>
			{/if}
		</div>
	</section>
</main>
