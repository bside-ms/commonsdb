<!--
	Dev-only showcase of lib/ui. Compare against the design canvas.
	Sample copy here is hardcoded on purpose: this page is tooling, not product UI.
-->
<script lang="ts">
	import { Button, Checkbox, FormField, Input, Select, Textarea } from '#lib/ui';

	let fontSize = $state<'m' | 'l' | 'xl'>('m');
	$effect(() => {
		const html = document.documentElement;
		if (fontSize === 'm') delete html.dataset.fontSize;
		else html.dataset.fontSize = fontSize;
	});
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
</main>
