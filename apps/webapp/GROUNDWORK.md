# Groundwork: types and tests

Two habits laid down before slice 1, because both are cheap to start
and expensive to introduce later.

---

## 1. Types from Laravel's OpenAPI spec

### The pipeline

```
Laravel (Scramble)          →  ../api/storage/app/openapi.json   (committed)
@hey-api/openapi-ts         →  src/lib/api/generated/            (gitignored)
$lib/server/api/client.ts   →  the only importer of generated code
$features/*/api/*.remote.ts →  call the wrapper
```

### Install

```sh
pnpm add -DE @hey-api/openapi-ts
pnpm add valibot
```

Pinned exactly, on purpose — the package is in initial development
and asks you to pin so upgrades happen when you choose.

On the Laravel side, Scramble infers the spec from type hints, route
definitions and FormRequests, so you write almost no annotations:

```sh
composer require dedoc/scramble
php artisan scramble:export --path=storage/app/openapi.json
```

### Scripts

```json
{
	"api:export": "cd ../api && php artisan scramble:export --path=storage/app/openapi.json",
	"api:generate": "openapi-ts",
	"api:sync": "pnpm api:export && pnpm api:generate"
}
```

`pnpm api:sync` after any backend route or FormRequest change. Commit
the spec, gitignore the generated output — the spec is the contract
worth reviewing in a diff, the generated code is noise.

### The one rule

**Nothing imports `src/lib/api/generated` except
`$lib/server/api/client.ts`.**

Generated code is rewritten wholesale on every run. One importer means
a regeneration is a one-file diff; direct imports across features mean
every regeneration touches the whole app and you stop reading the
diffs. Add it to ESLint's `no-restricted-imports` with an exception
for that one path.

### Validation comes from the same spec

The valibot plugin generates runtime schemas alongside the types, so
remote-function argument validation isn't a hand-written copy of
Laravel's rules that drifts:

```ts
import { query } from '$app/server';
import { api, sdk } from '$api/client';
import { vListTasksData } from '$lib/api/generated/valibot.gen';

export const listTasks = query(vListTasksData, async (params) =>
	api(sdk.listTasks, params)
);
```

Types alone wouldn't be enough here — remote function arguments cross
an HTTP boundary, so they need checking at runtime, not just at
compile time.

### Why a wrapper at all

`$lib/server/api/client.ts` exists to hold three things the generated
SDK can't know:

- the per-request auth token, read from `event.locals` rather than a
  module-level singleton (a singleton would leak one user's token into
  another user's request under concurrency)
- the event's `fetch`, so SvelteKit can dedupe and forward cookies
- Laravel's error shape flattened into something `FormField` can
  render directly

---

## 2. Tests

### Two vitest projects

`client` runs component tests in real Chromium via Playwright.
`server` runs plain logic in node, fast, no browser.

The split is in `vite.config.ts`. `*.svelte.test.ts` goes to the
browser; everything else to node.

```sh
pnpm test:unit            # both, watch
pnpm test:unit -- --run   # both, once
pnpm test:e2e             # playwright
```

### What to test, and what not to

**Don't test the design system's appearance.** Asserting that `Button`
renders `bg-accent` tests our own CSS: it breaks on every restyle and
catches nothing real.

**Do test the design system's behaviour.** The included examples are
the full set worth having at this stage:

- `FormField` — the aria contract. Label association, `aria-describedby`
  for hint and error, `aria-invalid`, the screen-reader-only required
  marker. These break silently and are invisible in review.
- `Modal` — focus moves in, focus returns on close, the dialog is
  labelled. This is really a contract test against Bits UI: if an
  upgrade changes focus handling, the test fails instead of a keyboard
  user finding it.

**Do test feature behaviour.** From slice 2 on, this is where the value
is: the shift state machine across all four statuses, filter logic,
form submission and error rendering.

**One Playwright spec per slice**, covering the path a human takes.
Slice 2: admin creates a task, member takes it. Slice 3: the full
claim → report → confirm → repro loop. These are smoke tests against a
real Laravel, not a second unit suite.

### Extra dev dependencies

```sh
pnpm add -D @testing-library/jest-dom
```

`vitest-setup-client.ts` imports `app.css` so component tests run
against real styles — without it, anything depending on layout,
visibility or portal positioning behaves differently in test than in
the app.

### Naming

Tests use the accessible name, not a CSS class or test id:
`getByRole('button', { name: 'Aufgabe übernehmen' })`. When a test is
hard to write that way, the component usually has an accessibility
problem worth fixing rather than working around.

---

## Note on routes

`src/lib/paths.ts` holds every route as a constant. Routes are English
and stay English — but keeping hrefs out of components costs nothing
now and is the whole prerequisite for adding translated URLs via the
`reroute` hook if a whitelabel deployment ever wants them. One file
changes instead of every component.