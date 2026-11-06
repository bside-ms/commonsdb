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

- **App**: SvelteKit (end-user PWA + guarded `/admin` routes, server side
  included — no separate backend service for now)
- **Domain**: framework-agnostic TypeScript package (`packages/core`)
- **Database**: Postgres, accessed via Drizzle (schema + migrations)
- **Auth**: Better Auth (OIDC/Keycloak via config, email/password for
  spaces without an IdP)
- **Background jobs**: a small worker process (pg-boss or
  graphile-worker, both Postgres-backed, no Redis) running the same
  `core`
- **Rich text**: TipTap, shared between end-user and admin views

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
    + worker). Other spaces need that, or a managed container platform.
- **Supply chain**: npm ecosystem risk is real. Mitigations: lockfile,
  install scripts disabled by default, small dependency count, regular
  audits.
- **Single deployable**: UI and server logic ship together, which is
  simple, but couples them until/unless sliced (below).

## Core design principle: fixed core vs. pluggable boundary

Not everything needs to be adjustable. Only swap what genuinely differs
between spaces; keep the domain logic that *is* the product opinionated
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
  new rule *instances* are data/config, not code changes. New rule
  *types* are small classes implementing a common interface.
- **Tasks** for space maintenance.
- **Authorization policies** — server-side checks (who may do what) live
  in `core`, not in route handlers or the UI.

### Pluggable boundary (ports and adapters, swappable per deployment)

- **Auth** — now mostly **Better Auth configuration** rather than
  hand-written adapters: OIDC provider (e.g. Keycloak at bside) or
  email/password for spaces with no IdP. `core` only depends on a small
  "current user/identity" port, so the auth library does not leak into
  the domain.
- **`CalendarProvider`** — where booking events actually live. Reference
  implementations: internal DB (default), CalDAV, Google Calendar.

Selection happens via config/environment variables wired at a single
composition root (constructor injection, no DI framework needed), so
forking spaces adjust behavior without touching core code — or add a new
adapter if their setup isn't covered yet.

## Slicing later

SvelteKit routes, form actions and remote functions stay **thin**: they
authenticate, call a service in `core`, and return the result. Nothing in
`core` imports from SvelteKit. This keeps options open:

- add Hono as `apps/api` importing `core` if a public/integration API
  becomes necessary (other spaces integrating, mobile client, etc.)
- run the worker as a second entrypoint on the same `core`
- the reverse is not cheap: leaving TypeScript means rewriting `core`

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

- **User** vs **Profile**: User = account/identity (via Better Auth).
  Profile = human-facing display info (name, avatar, bio). Kept distinct
  from auth concerns.
- **Account concept**: a shared conceptual role (not necessarily a DB
  table) that both **User** and **Initiative** fulfill — anything that
  can hold a ledger balance and be the "party" on a booking. User and
  Initiative stay distinct entities (auth, roles, membership differ) but
  both *are-an* Account for ledger/booking purposes.
- **User ↔ Initiative**: many-to-many via a proper relationship entity
  (not just a flag pivot) — a User can belong to zero, one, or many
  Initiatives; standalone use without any Initiative is fully supported.
  The relationship carries an initiative-scoped role.
    - Better Auth ships an organization plugin (members, roles,
      invitations). Worth evaluating as a foundation, but the domain model
      (roles as data, Account concept, ledger) stays owned by `core`; the
      auth library must not own it.
- **Roles — flexible by design**: roles are data, not hardcoded
  enums/booleans. Two separate role *scopes*:
    - Platform-scoped roles (assigned to a User directly) — for now just
      `user` / `platform_admin`, modeled so more roles (e.g. "certificate
      issuer") can be added later without code changes.
    - Initiative-scoped roles (assigned on the User↔Initiative
      relationship) — for now `member` / `admin`, same flexibility intent.
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
      push the *sender* negative, or only resource spending? Leaning
      toward: transfers must not create/increase a negative balance.

## Repo structure (decided)

Monorepo, coupled releases (one version number covers everything, so
"which version am I running" stays a single answer even after other
spaces fork and customize adapters). Package manager: pnpm workspaces.

```
├── apps/
│   └── webapp/        # SvelteKit — PWA + guarded /admin routes, thin
│                       # controllers only
├── packages/
│   ├── core/           # domain: ledger, resource rules, tasks,
│   │                   # initiatives, policies, ports + adapters
│   └── db/             # Drizzle schema + migrations (may fold into
│                       # core — decide when scaffolding)
├── docs/              # cross-cutting docs (adapters, deployment, decisions)
├── infra/             # docker compose, deploy scripts, CI
├── ARCHITECTURE.md     # this file
├── README.md           # project idea, structure, getting started
├── CONTRIBUTING.md
└── LICENSE             # GPL-3.0 (per Stiftung/Fördergeld agreement:
                         # "offene Veröffentlichung unter GPL-3")
```

`docs/adapters.md` is the key open-source-adoption doc — how to
configure Better Auth for a different identity setup and how to
implement `CalendarProvider` for a different calendar system.

### Local dev environment

docker compose (Postgres, optional mail catcher) plus pnpm, or a
devcontainer — to keep "clone and run" easy for contributors at other
spaces. Replaces DDEV from the earlier Laravel plan. Dev tooling only;
production deployment is covered in `docs/deployment/`.

Database: Postgres, decided. No longer constrained by shared-hosting
MySQL availability.

## Open / to revisit in dedicated chats

- **Core chat**: entity/schema design (Account/User/Initiative/Role/
  Transaction), ledger transaction semantics (hold vs. charge on
  cancellation, credit/blocking mechanics), resource-rule class design
  and its relation to account-standing checks, `CalendarProvider`
  interface, composition root, Better Auth organization plugin vs.
  own model, whether `db` is its own package.
- **Webapp chat**: SvelteKit structure, route groups for end-user vs.
  `/admin`, TipTap integration, booking UX, PWA/offline considerations,
  load/action patterns that keep controllers thin.
- **Infra chat (later)**: docker compose, worker process, deployment docs
  for VPS/Docker, CI, supply-chain hygiene (lockfile, script policy).