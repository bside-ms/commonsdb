# Frontend structure

## What SvelteKit actually mandates

Only two things:

- `src/routes` is the router. File names are URLs.
- `src/lib/server` is never bundled into client code. Importing it from
  anything the browser loads is a build error.

Everything else under `src/lib` is ours to organise. `$lib/ui` was a
convention I picked, not a framework rule — so your `design-system` /
`features` split is fine, it just needs to sit inside `src/lib`.

## Why inside `src/lib`

The docs say remote files can live anywhere in `src` except
`src/lib/server`. In practice the manifest scanner has only walked
`src/lib` and `src/routes`, so a `.remote.ts` under `src/features/`
returns 404 at runtime with a confusing build warning.

Rather than depend on that being fixed, the folders live under
`src/lib` and aliases make the imports read the way you wanted:

```ts
import {Button, Card} from '$ui';
import {TaskCard, listTasks} from '$features/tasks';
```

Nobody writes `$lib/features/tasks/components/TaskCard.svelte`.

## The tree

```
src/
├── app.css                     theme + base. the only place colours exist
├── app.html
├── hooks.server.ts             session, Keycloak token refresh, locals
│
├── lib/
│   ├── ui/                     $ui — the design system
│   │   ├── Button.svelte           pure. no domain knowledge.
│   │   ├── Card.svelte             knows nothing about tasks, users,
│   │   ├── FormField.svelte        repros or shifts.
│   │   ├── Modal.svelte
│   │   ├── …
│   │   ├── toast.svelte.ts
│   │   └── index.ts            the only import surface
│   │
│   ├── features/               $features — one folder per slice
│   │   ├── auth/
│   │   ├── profile/
│   │   ├── tasks/
│   │   │   ├── api/
│   │   │   │   └── tasks.remote.ts     query/form/command
│   │   │   ├── components/
│   │   │   │   ├── TaskCard.svelte     domain-aware, built from $ui
│   │   │   │   ├── TaskFilters.svelte
│   │   │   │   └── ShiftClaimButton.svelte
│   │   │   ├── types.ts
│   │   │   └── index.ts        public surface of the feature
│   │   └── ledger/
│   │
│   ├── server/                 never reaches the browser
│   │   ├── api/                $api — the Laravel client
│   │   │   ├── client.ts           fetch wrapper, base URL, errors
│   │   │   └── auth.ts             Keycloak tokens from httpOnly cookies
│   │   └── env.ts
│   │
│   └── paths.ts                route constants, so links aren't strings
│
└── routes/
    ├── +layout.svelte          imports app.css, renders Toaster
    ├── (app)/                  member area — AppShell with member nav
    │   ├── +layout.svelte
    │   ├── aufgaben/
    │   │   ├── +page.svelte
    │   │   └── [id]/+page.svelte
    │   └── konto/+page.svelte
    ├── (admin)/                admin area — same shell, admin nav
    │   └── verwaltung/
    └── (auth)/                 login, registration — no shell
        ├── anmelden/
        └── registrieren/
```

## The four rules that keep it from rotting

**1. `$ui` knows nothing about the domain.**
If a component mentions a task, a shift, a repro or a user, it belongs
in a feature. `TaskCard` lives in `$features/tasks`; the `Card` it is
built from lives in `$ui`. The dependency runs one way only — `$ui`
never imports from `$features`.

**2. Features talk to each other only through `index.ts`.**
`import { TaskCard } from '$features/tasks'` is fine.
`import TaskCard from '$features/tasks/components/TaskCard.svelte'` is
not. The index is the contract; everything else is internal and can be
refactored freely.

If two features need the same thing, it moves to `$ui` (if it's
presentational) or `$lib` (if it's logic). It does not get imported
sideways.

**3. Routes are thin.**
A `+page.svelte` composes feature components and calls feature remote
functions. If it contains business logic or more than a little layout
glue, that logic belongs in the feature. The route's job is to decide
*which* feature pieces appear at *this* URL.

**4. Only `$lib/server/api` talks to Laravel.**
Remote functions in `$features/*/api/*.remote.ts` call the client in
`$lib/server/api`. Nothing else does. Remote functions cannot live in
`$lib/server`, so this split is forced by the framework anyway — but
it's also the right shape: one place knows the base URL, the auth
header, and how Laravel reports validation errors.

## Route groups

`(app)`, `(admin)` and `(auth)` are groups — parentheses mean they
don't appear in the URL. `/aufgaben`, not `/app/aufgaben`. They exist
so each can have its own `+layout.svelte`: member shell, admin shell,
and no shell at all for login.

This is where `AppShell`'s `area` prop gets set, once per group,
instead of on every page.

## German route names

`aufgaben`, `konto`, `anmelden` — the URLs are part of the interface
and the interface is German. Code identifiers stay English
(`listTasks`, `TaskCard`), because mixed-language identifiers are
worse than either consistent choice.

## Growing it

A new slice adds one folder under `$features` and one route group
entry. Slice 2 adds `$features/tasks`. Slice 3 adds
`$features/ledger`. Slice 6 adds `$features/messages`. Nothing in
`$ui` changes unless a second feature needs the same primitive —
which is rule 1 of the design system doing its job.