# Design system

Lives in `src/lib/ui/`. Built in ROADMAP slice 0 from the design team's
prototype (`b-side_prototyp_aktuell_september-2026.html`). The visual
reference is the Design canvas "B-SIDE Design System — Slice 0"
(tokens board + primitives board).

PDF exports of the canvas: [`design-system/tokens.pdf`](design-system/tokens.pdf),
[`design-system/primitives_and_layout.pdf`](design-system/primitives_and_layout.pdf).

The prototype is directional, not a spec (see ROADMAP). This page records
what we took from it and how the code is organised, so later slices add
to it instead of around it.

## The look in one paragraph

Hard 1px ink (`#111`) lines, square corners, flat colour fields, no
shadows, one typeface (Archivo 400/500/600, never bolder). Black is the
primary action; orange (`accent`) means "this is the active / focused
thing". Each member area has its own colour (Start pink, Aufgaben orange,
Commons green, Initiativen blue, Qualifikationen yellow), always with ink
text on top.

## Stack

| Concern            | Choice                                                                  |
| ------------------ | ----------------------------------------------------------------------- |
| Styling            | Tailwind v4, theme defined in `src/lib/ui/tokens.css` (`@theme static`) |
| Headless behaviour | [Bits UI](https://bits-ui.com) for Dialog, Tabs, Popover, Combobox, …   |
| Variants           | `tailwind-variants` (`tv`), via our own `tv` export                     |
| Class merging      | `cn()` = `clsx` + `tailwind-merge`, configured for our tokens           |
| Icons              | [Lucide](https://lucide.dev) (`@lucide/svelte`), stroke 1.9–2           |
| Fonts              | `@fontsource/archivo`, 400 preloaded in `+layout.svelte`                |
| Long text          | `@tailwindcss/typography` (`prose`), recoloured in `app.css`            |

## Tokens

Single source of truth: `src/lib/ui/tokens.css`.

- `@theme static` holds everything Tailwind should turn into utilities:
  colours (`bg-ink`, `text-muted`, `bg-area-commons`), the type scale,
  `rounded-full`, breakpoints. `static` emits every token as a CSS
  variable on `:root` too, so plain CSS can use `var(--color-ink)`.
- Tailwind's default colours, radii, shadows and type sizes are wiped
  (`--color-*: initial` etc.). `bg-blue-500`, `rounded-lg`, `shadow-md`
  and `text-xl` do not exist here, on purpose.
- A plain `:root` block holds shared values that aren't Tailwind theme
  keys: focus ring, avatar sizes, shell widths, `--touch-min`.
- Spacing uses Tailwind's default scale (`p-4` = 1rem).

**Type scale.** Each `text-*` utility sets size, line height, tracking
and weight together: `caps` 11, `tiny` 13, `small` 14, `button` 15,
`body` 16, `h3` 17, `h2` 22, `stat` 27, `h1` 44, `saldo` 48, `display` 52
(px at the default 16px root). Headings get their size in `@layer base`.

**Breakpoints** follow the prototype: `sm` 520, `md` 760 (admin nav
collapses), `lg` 900 (member shell switches bottom nav → side nav),
`xl` 1500.

**Font-size switcher.** `html[data-font-size="l" | "xl"]` sets the root to
18 / 20px. Everything is rem, so the whole UI scales. No `px` font sizes
anywhere in the app.

### When you add a token

1. Add it to `tokens.css`.
2. If it's a colour or a `text-*` size, add its name to the lists in
   `src/lib/ui/utils.ts` (`twMergeConfig`). Otherwise `cn()` treats e.g.
   `text-h2` and `text-ink` as the same group and drops one.

## Components

### Conventions

- One folder per component: `src/lib/ui/<name>/<Name>.svelte` + `index.ts`
  (+ `variants.ts` when it has variants). Everything is re-exported from
  `src/lib/ui/index.ts`.
- **Routes import from `#lib/ui` only.** Never import `bits-ui` in a
  route; wrap it in a `lib/ui` component so the props stay ours.
  `#lib/ui` works because of an explicit entry in `package.json`
  `imports` (`"#lib/ui": "./src/lib/ui/index.ts"`): subpath imports
  don't resolve folder index files, so don't remove it.
- Variants with `tv` from `#lib/ui` (not from `tailwind-variants`
  directly, it carries our merge config). Max three values per variant
  without a conversation; extra axes (e.g. `tone: danger`) are separate
  props.
- Every component takes `class` and merges it last, so callers can adjust
  layout (`class="w-full sm:col-span-2"`) without fighting the defaults.
- A component enters `lib/ui` on its **second** use. Until then it lives
  next to the route that needs it.
- **No hardcoded strings.** Text a component shows by itself (the
  "(optional)" marker, a dialog's close label) comes from Paraglide,
  keys prefixed `ui_`. Everything else is passed in by the caller,
  already translated.
- **Errors arrive translated.** Components take a message string. The
  route maps `core`'s error code with `errorMessage(code)`, so `lib/ui`
  never knows about `core`.
- **Accessibility is the component's job**: FormField wires `for`/`id`,
  `aria-describedby` (hint + error) and `aria-invalid` into the control
  through context; visible focus everywhere (`:focus-visible` → 3px orange
  outline, fields → inset orange border).
- **Native where native is enough.** Input, Select, Checkbox are real
  form elements: they post with plain form actions and work without JS.
  Bits UI comes in where native has no answer (Dialog focus trap, Tabs,
  Combobox with search).

### Status

| Component    | State | Notes                                                                                                                          |
| ------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| `Button`     | done  | `variant` primary/ghost/accent, `size` md/sm, `tone` danger, `block`, renders `<a>` with `href`                                |
| `FormField`  | done  | label + hint + error + "(optional)", context for the control                                                                   |
| `Input`      | done  | text-like types, `bind:value`                                                                                                  |
| `Textarea`   | done  | min 88px, vertical resize                                                                                                      |
| `Select`     | done  | native, `options` array, Lucide chevron                                                                                        |
| `Checkbox`   | done  | own label/hint/error, native                                                                                                   |
| `Card`       | done  | optional `title` (+ `level`) and `actions` header strip, `padded`                                                              |
| `Badge`      | done  | `tone` neutral/attention/success/info (by meaning, not colour; 4 values, open for discussion), `outline`                       |
| `Chip`       | done  | toggle with `aria-pressed`, `size` md/sub, `href` for no-JS filters                                                            |
| `Avatar`     | done  | `name` → initials + accessible name, `src` with fallback, `size` sm/md/lg, area `color` (auto from name if omitted)            |
| `EmptyState` | done  | dashed box, `title`, `description`, Lucide `icon`, `action` snippet                                                            |
| `Modal`      | done  | Bits `Dialog`; bottom sheet < `lg`, centred above; `bind:open` or `trigger` snippet; `actions` row                             |
| `Toast`      | done  | `toast(message, { tone })` + `<Toaster/>` in the root layout; client-side only                                                 |
| `AppShell`   | done  | `variant` member/admin, `items` from `#lib/navigation.ts`, `actions` / `footer` snippets, skip link; nav hidden with < 2 items |

The root `+layout.svelte` picks the shell: admin variant under `/admin`,
member variant elsewhere, no shell when logged out (login), no nav during
onboarding. New areas are added in `src/lib/navigation.ts`.

Stays in routes until a second use: task row, stat tile, balance
("Saldo"), tabs, table, "thanks" card.

## In routes

- Headings are plain `<h1>`–`<h3>`; size comes from `app.css`.
- Only token colours (`bg-ink`, `text-muted`, `bg-area-tasks` …).
  Tailwind's default palette doesn't exist here: `bg-black` silently
  renders nothing.
- New nav entries go in `src/lib/navigation.ts`; the member nav appears
  as soon as there are two items.
- Patterns used once (task row, stat tile, balance) stay in the route
  until a second use, then move to `lib/ui`.

## Showcase

`/dev/ui` (dev server only, 404 in production) shows every component,
with a font-size switcher. Check new components there against the design
canvas before using them in a route.
