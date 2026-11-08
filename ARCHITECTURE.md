# Architecture Overview — Space Management Platform

Status: conceptual, pre-implementation. This doc captures decisions made so
far so they survive across separate chats/contexts (core/domain, webapp)
and stay legible to future contributors.

## Purpose

A platform for shared community spaces to organize:

- Tasks for maintaining the common space
- Booking of resources (meeting rooms, kitchen, cargo bikes and more)
- Certificates/qualifications as prerequisites for using certain resources or assigning certain tasks
- An internal currency ("repros", from "reproduction") earned by
  contributing and spent to use resources
- Users, who can belong to and/or administrate one or more Initiatives

Funded by Kommunale Stiftungen Münster → must be open source (GPL-3.0) and reasonably
adjustable by other spaces with different infrastructure.

## Stack

A plain TypeScript stack, one language end to end:

- **App**: SvelteKit 3 (end-user PWA + guarded `/admin` routes, server
  side included — no separate backend service for now)
- **Domain**: framework-agnostic TypeScript package (`packages/core`)
- **Database**: Postgres 17, accessed via Drizzle (schema + migrations in
  `packages/db`)
- **Auth**: Better Auth, wrapped in `packages/auth` (Keycloak/OIDC via
  config, email/password behind a flag for spaces without an IdP)
- **Validation**: valibot in `core` (Standard Schema, so the same schemas
  can validate forms and remote functions)
- **Server ↔ UI**: SvelteKit remote functions (experimental flag on).
  `query` for reads, awaited in components (Svelte async mode, rendered on
  the server); `form` for writes, spread onto `<form>`, works without JS.
  `load` and form actions remain for auth and profile, which predate this.
- **i18n**: Paraglide JS, German as the only locale for now
- **UI**: Tailwind v4 (theme = design tokens in `apps/webapp/src/lib/ui/`),
  Bits UI as headless component base, tailwind-variants, Lucide icons.
  Conventions in `apps/webapp/docs/design-system.md`
- **Background jobs**: a small worker process (pg-boss or
  graphile-worker, both Postgres-backed, no Redis) running the same
  `core` — not built yet
- **Rich text**: TipTap 3, in `packages/richtext`. One extension list per
  use ("profile": `description` now; messages and wiki later) feeds the
  editor, the server-side validation (`parseRichText`, also checks link
  protocols and heading levels) and the HTML renderer (`toHtml`, via
  `@tiptap/static-renderer`, no DOM needed). Stored as TipTap JSON;
  readers get server-rendered HTML and load no TipTap. The webapp bundles
  TipTap/ProseMirror into its server build (`ssr.noExternal`), because
  ProseMirror breaks when two copies are loaded.

### History: why not Laravel

Laravel was the original choice (low barrier, cheap shared hosting,
patterns built into the framework). We moved away because the team's
strength is TypeScript, one language across frontend and backend removes
duplicated business rules and enables shared types, and Better Auth +
Drizzle cover a large part of what Laravel gave us. This was a conscious
trade-off — see "Trade-offs accepted" below. Hono (as a separate API) or
a different backend remain possible later because the domain lives in
`core` (see "Slicing later"), but a move to a non-TypeScript backend
would mean rewriting the domain.

### Trade-offs accepted

- **Hosting**: cheap shared PHP hosting is no longer a target. The
  reference deployment is Docker or a small VPS (Node process + Postgres
  - worker). Other spaces need that, or a managed container platform.
- **Supply chain**: npm ecosystem risk is real. Mitigations: lockfile,
  install scripts disabled by default, small dependency count, regular
  audits.
- **Single deployable**: UI and server logic ship together, which is
  simple, but couples them until/unless sliced (below).

## Core design principle: fixed core vs. pluggable boundary

Not everything needs to be adjustable. Only swap what genuinely differs
between spaces; keep the domain logic that _is_ the product opinionated
and simple.

### Fixed core (no swapping needed, lives in `packages/core`)

- **Ledger / repros system** — the product's core value; double-entry-ish,
  transactional, auditable. Postgres transactions plus CHECK constraints
  as a belt-and-suspenders guard. Not pluggable by design.
- **Multi-tenancy**: Users ↔ Initiatives via a relationship entity
  carrying an initiative-scoped role.
- **Resource access rules** — "requires certificate X", "costs N repros",
  "initiative members only", "max duration" etc. Modeled as a composable
  rule chain (internal Strategy pattern) attached to each Resource, so
  new rule _instances_ are data/config, not code changes. New rule
  _types_ are small classes implementing a common interface.
- **Tasks** for space maintenance.
- **Authorization policies** — server-side checks (who may do what) live
  in `core`, not in route handlers or the UI.

### Pluggable boundary (ports and adapters, swappable per deployment)

- **Auth** — Better Auth configuration, not hand-written adapters.
  `packages/auth` exports `createAuth(options)`: Keycloak/OIDC (issuer,
  client id/secret) or email/password, chosen by env vars. Two seams keep
  the library out of the domain:
  - `core` only sees an **`Actor`** (`{ id, platformRole }`), never a
    Better Auth session.
  - `createAuth` exposes an **`onUserCreated`** callback; the webapp
    connects it to `core` (profile provisioning). `auth` never imports
    `core`.
- **`CalendarProvider`** — where booking events actually live. Reference
  implementations: internal DB (default), CalDAV, Google Calendar. Not
  needed before resource booking (ROADMAP slice 10).
- **`KnowledgeProvider`** — where wiki/knowledge entries live. Entities
  (tasks, resources, qualifications) link to entries; they never own
  wiki content. Reference implementations: built-in (pages in our DB,
  TipTap content, Postgres full-text search) as default, Outline via its
  API. Links are stored provider-neutral
  (`entity, provider, ref, cached title`), so switching providers needs
  no schema change. Built-in pages export to Markdown so a space can move
  to Outline later.

All wiring happens in one **composition root** per app
(`apps/webapp/src/lib/server/services.ts`): it reads env, creates `db`
and `auth` once, and passes them on. Packages receive configuration and
never read env vars or import framework code. A worker or test sets up
its own root the same way.

## Slicing later

SvelteKit routes, form actions and remote functions stay **thin**: they
authenticate, call a service in `core`, and return the result. Nothing in
`core` imports from SvelteKit. This keeps options open:

- add Hono as `apps/api` importing `core` if a public/integration API
  becomes necessary (other spaces integrating, mobile client, etc.)
- run the worker as a second entrypoint on the same `core`
- the reverse is not cheap: leaving TypeScript means rewriting `core`

## Remote functions

- Live next to the routes that use them: `routes/<area>/<name>.remote.ts`.
  A file must export nothing but remote functions; don't name helpers
  `remote.ts`.
- Each function authorizes itself first (`requireActor` / `requireAdmin` /
  `requireSuperadmin` from `lib/server/guards.ts`). Remote calls have their
  own URL, and the hooks guard only sees the calling page, so it can't
  protect them.
- They stay thin: authorize, call core, translate errors. Validation of
  domain input is core's job (`form('unchecked', …)`); a valibot schema in
  the remote function only for plain arguments like ids.
- Core errors: `toFormIssues` in forms (per-field issues, codes as
  messages), `toHttpError` in queries (403/404/400). The UI translates
  codes with `errorMessage()`.
- Inputs come from `form.fields.<name>.as(...)`; `.for(id)` when the same
  form appears more than once (rows, one per entity).

## Tests

- **core**: integration tests next to the code (`*.test.ts`), Node's
  test runner, no build step. `createTestDb()` from
  `@commonsdb/db/testing` gives an in-memory Postgres (PGlite) with the
  real migrations; `reset()` before each test, factories for users and
  categories. Every rule a service enforces gets a test.
- **richtext**: unit tests for schema, links, rendering.
- **webapp**: Playwright e2e in `apps/webapp/e2e/` against a production
  build (`vite build` + `vite preview`), a real Postgres database of its
  own (`commonsdb_e2e`, recreated per run; the name must contain `e2e` or
  `test`) and real email/password login. Users are created through Better
  Auth in `global-setup.ts`, logged in once in `auth.setup.ts`;
  `as('kim')` gives a logged-in page. Selectors are roles and visible
  German text, no test ids. Covers the main flows, not every rule (that's
  core's job).
- `pnpm test`: core + richtext, fast, no database. `pnpm test:e2e`:
  browser tests, needs `pnpm db:up`.

## Admin dashboard decision

Admin views live as guarded `/admin` routes inside the same SvelteKit
app, not a separate tool. Considered (when the backend was Laravel):
Filament vs. SvelteKit-built admin; SvelteKit won and the reasoning still
holds.

- The admin UI needs no per-space adjustability; adjustability lives
  behind the auth/calendar boundary.
- Two admin tiers: platform-wide admin (rare, small trusted group) and
  initiative-level self-service admin (common). Both are route groups
  differentiated by role and the services they call.
- Shared components between admin and end-user views: TipTap editor and
  config, date/time pickers for bookings, the resource-rule-builder UI
  (used at different scopes), validation and notification patterns.
- Accepted: more hand-built CRUD than a generated admin panel, in
  exchange for UI/UX consistency.

### Important constraint

Hiding a button is not authorization. Every route/action must enforce
permissions server-side through the policies in `core`, regardless of
which UI rendered it.

## Fundamentals: Users, Initiatives, Roles, Ledger (decided)

- **User** vs **Profile**: `user` = identity, owned by Better Auth
  (generated schema). `profile` = the human-facing person, owned by us,
  one per user (PK = `user_id`), created on first login via
  `onUserCreated`, with an `ensureProfile` fallback on each request.
  Fields per ROADMAP slice 1: display name, pronoun, phone, accessibility
  note (free text for shift planning, explicitly not a medical record),
  interests (JSON of super-category ids until categories exist),
  visibility (`members | admins`), photo visibility
  (`members | admins | nobody`), two notification flags,
  `onboarded_at`, `rules_accepted_at`. Collected now, no behaviour built
  on them yet.
- **Onboarding**: with Keycloak, registration happens at the IdP. The
  app's equivalent is a one-time `/onboarding` screen after first login
  (profile fields + accepting the house rules). Everything except
  `/onboarding` and `/logout` redirects there until `onboarded_at` is
  set. Admin approval of new members: still open (see ROADMAP).
- **Roles — revised**: one **platform role** per user,
  `member | admin | superadmin`, stored as `user.platform_role` via Better
  Auth `additionalFields` (`input: false`, so it cannot be set through
  the auth API; arrives with the session, no extra query). Managed in the
  app, not mapped from Keycloak — mapping can become an optional auth
  setting later.
  - The earlier "roles as data in a table" idea is replaced: the
    flexibility it was meant to provide lives in **category-scoped
    capabilities** (ROADMAP slice 2), not in the platform role.
  - Whether `admin` stays a role or becomes "has capabilities" is still
    open (ROADMAP, "Noticed, not decided").
  - Initiative-scoped roles (`member` / `admin` on the
    User↔Initiative relationship) remain as planned for slice 9.
- **Account concept**: a shared conceptual role (not necessarily a DB
  table) that both **User** and **Initiative** fulfill — anything that
  can hold a ledger balance and be the "party" on a booking. User and
  Initiative stay distinct entities (auth, roles, membership differ) but
  both _are-an_ Account for ledger/booking purposes.
- **User ↔ Initiative**: many-to-many via a proper relationship entity
  (not just a flag pivot) — a User can belong to zero, one, or many
  Initiatives; standalone use without any Initiative is fully supported.
  The relationship carries an initiative-scoped role.
  - Better Auth ships an organization plugin (members, roles,
    invitations). Worth evaluating as a foundation, but the domain model
    (roles as data, Account concept, ledger) stays owned by `core`; the
    auth library must not own it.
- **Ledger (repros) — Approach B, confirmed**:
  - Both Users and Initiatives hold a balance (they're both Accounts).
  - Users earn repros (tied to completing tasks/contributions). Earning
    is always credited to a User for now.
  - Users can transfer repros to an Initiative's balance.
  - Either a User or an Initiative can spend from its own balance to pay
    for a resource booking.
  - Every transaction carries a **reason/memo** field (like
    `Verwendungszweck`) — covers today's needs (task credit, resource
    payment, transfer) and future ones (e.g. "commons working day"
    contributions by people without an account, credited to an
    Initiative by an organizer, documented via the memo) without a
    schema change.
  - **Credit / negative balance**: allowed, bounded. Each Account has a
    credit limit (floor) and, while negative, a `credit_since` timestamp.
    After a grace period an unsettled negative balance blocks the
    Account from further resource use. Account standing (blocked or not)
    is a check independent from per-resource access rules — two separate
    rule types that both gate a booking. The grace-period check runs in
    the background worker.
  - Open question: should transfers (User → Initiative) be allowed to
    push the _sender_ negative, or only resource spending? Leaning
    toward: transfers must not create/increase a negative balance.

## Repo structure (decided)

Monorepo, coupled releases (one version number covers everything, so
"which version am I running" stays a single answer even after other
spaces fork and customize adapters). pnpm workspaces.

```
├── apps/
│   └── webapp/         # SvelteKit — composition root, routes, UI;
│       └── e2e/        # Playwright tests against a production build
├── packages/
│   ├── db/              # Drizzle schema (incl. generated Better Auth
│   │                    # tables), migrations, createDb, runMigrations;
│   │                    # /testing: PGlite test db, factories
│   ├── auth/            # createAuth(options) around Better Auth
│   ├── core/            # domain services, Actor, policies, input
│   │                    # schemas, domain errors (+ *.test.ts)
│   └── richtext/        # TipTap profiles, parseRichText, toHtml
├── docs/
├── docker-compose.yml   # Postgres (+ optional local Keycloak)
├── tsconfig.base.json
├── pnpm-workspace.yaml  # packages, catalog, build-script allowlist
├── ARCHITECTURE.md
├── ROADMAP.md
└── ...
```

Dependencies point one way: `webapp → auth → db`, `webapp → core → db`,
and `core`, `db`, `webapp → richtext` (which depends on nothing internal).
`core` and `auth` never depend on each other or on SvelteKit.

### Package conventions

- **No build step** for internal packages: `exports` point at
  `src/index.ts`, consumers (Vite, drizzle-kit, Node type stripping)
  read source directly. Relative imports use the `.ts` extension
  (`allowImportingTsExtensions`).
- **Shared versions via the pnpm catalog** (`better-auth`, `drizzle-orm`,
  `typescript`, …) so packages cannot drift apart.
- **Supply chain**: `minimumReleaseAge` and an explicit `allowBuilds`
  allowlist in `pnpm-workspace.yaml`; install scripts are opt-in per
  package.
- **Better Auth schema** is generated, never hand-edited:
  `pnpm --filter @commonsdb/auth schema` writes
  `packages/db/src/schema/auth.ts` from `packages/auth/auth.config.ts`
  (dummy values; the CLI only needs to know which features are on), then
  `pnpm db:generate` / `pnpm db:migrate`. Generated schema and migrations
  are committed.
- **Erasable TypeScript only.** No enums, namespaces or constructor
  parameter properties: Node runs package sources by stripping types
  (seed, worker), which only works for erasable syntax.

### Conventions across the stack

- **`core` returns codes, never user-facing text.** Validation and
  domain errors carry codes (`profile_display_name_required`); the
  webapp maps them to messages via the `error_<code>` key convention in
  Paraglide. This keeps `core` usable by a worker or a future API and
  keeps all wording in message files.
- **i18n**: German-only for now, but every UI string goes through
  Paraglide (`apps/webapp/messages/de.json`) from the start. Other spaces
  change wording by editing message files (rebuild needed, no code
  changes); adding a language is a new message file plus one entry in
  `project.inlang/settings.json`. No locale prefixes in URLs; a future
  second language would be chosen per profile. Runtime-editable text (e.g.
  the "About" page) is content in the database, not i18n.
- **Authorization lives in `core`.** The hooks guard is coarse (session,
  onboarding, `/admin` needs admin); services enforce the real rules
  (e.g. "edit _own_ profile" via the actor in the query).
- **Redirects to external origins** use SvelteKit's allowlist
  (`{ external: [keycloakOrigin] }`), never `{ external: true }`.
-

### Local dev environment

`docker compose up -d db` (Postgres) plus pnpm. One `.env` at the repo
root for everything; the webapp reads it via SvelteKit's
`env: { dir: '../..' }`, packages via `process.loadEnvFile`. Env vars for
the webapp are declared and validated in `apps/webapp/src/env.ts`
(SvelteKit 3 `defineEnvVars`). Development authenticates against the
B-Side Keycloak `Test` realm; a local Keycloak in docker compose stays
available for offline work.
`pnpm db:up` starts the docker Postgres. The e2e tests use a separate
database on the same server, created and dropped by the tests; the dev
database is never touched.

Database: Postgres, decided.

## Open / next

- **Slice 3 — report, confirm, repros**: next. Repro storage is decided
  (integer tenths, like shift hours).
- **CI**: GitHub Actions with a Postgres service running `pnpm check`,
  `pnpm test`, `pnpm test:e2e`.
- **Admin roles**: still set by SQL; a superadmin user list with role
  assignment is open (with "Mitglieder" in the admin nav).
- **Keycloak logout**: signing out ends the app session only; decide
  whether to also end the IdP session.
- **Experimental SvelteKit features** (remote functions, Svelte async):
  in use since slice 2; two dev-only warnings after form redirects are
  known (see slice 2 notes). Re-check on SvelteKit updates.
- **TypeScript 7**: packages use the native compiler; editor and
  `svelte-check` tooling may lag — pin via catalog if it causes trouble.
- Later: worker process, deployment docs (VPS/Docker), ledger semantics,
  Better Auth organization plugin vs. own initiative model.
