# Frontend setup notes

## Fixes to the generated project

**`svelte.config.js`** — the experimental flags were missing. Added
`kit.experimental.remoteFunctions`, `kit.experimental.explicitEnvironmentVariables`
and `compilerOptions.experimental.async`, plus `vitePreprocess()`.

**`package.json`** — remove the unused adapter:

```sh
pnpm remove @sveltejs/adapter-auto
```

**Pin SvelteKit.** Remote functions are explicitly outside semver, so a
`^2.63.0` range can break a `.remote.ts` file on any minor bump. Change
it to `"@sveltejs/kit": "2.63.0"` and upgrade deliberately.

## Wiring

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import { Toaster } from '$lib/ui';
	let { children } = $props();
</script>

{@render children()}
<Toaster />
```

Archivo goes in `static/fonts/` at weights 400, 500 and 600, declared
with `@font-face` in `app.css`. The prototype embeds it as base64 —
fine for a single-file mockup, not for a real build.

## Conventions

1. **A component enters `$lib/ui` on its second use.** Until then it
   lives in the route that needs it.
2. **No arbitrary colour or font-size values.** `bg-accent`, never
   `bg-[#f0703a]`; `text-small`, never `text-[14px]`. The text-size
   switcher moves the root font size, so one hardcoded `px` breaks
   accessibility for the person who needed it. Arbitrary values for
   *spacing* are fine where the prototype's rhythm needs them
   (`py-[13px]`) — it's colour and type that must stay tokenised.
3. **Bits UI is never used raw in a route.** It gets wrapped in
   `$lib/ui` with tokens applied, so the app imports from one place
   and a Bits UI major upgrade touches one directory.
4. **Accessibility belongs to the primitive.** `FormField` owns the
   aria wiring, `Modal` inherits focus management from Bits UI,
   `AppShell` owns the skip link. Callers never repeat it.
5. **Colour never carries meaning alone.** `Badge` always has text;
   `Avatar` is `aria-hidden` with the name rendered beside it.

A CI guard for rule 2, cheaper than an ESLint plugin:

```sh
! grep -rnE '(bg|text|border)-\[#|text-\[[0-9.]+(px|rem)\]' src --include='*.svelte'
```

## What Bits UI handles now

`Modal` (Dialog), `Select`, `Checkbox`. Everything else is plain
markup with tokens — Bits UI adds nothing to a button or a badge.

Still to come, when a slice needs it: `DatePicker` and `RangeCalendar`
for the task `when` field (slice 2), `Combobox` if the category picker
outgrows a select, `Tabs` for the admin task queue (slice 4).

## Not converted

The old scoped-`<style>` versions are gone. If anything looks off
against the prototype, the theme block in `app.css` is the only place
to change it — no component carries a raw colour.