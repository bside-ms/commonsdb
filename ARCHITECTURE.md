# Architecture Overview — Space Management Platform

Status: conceptual, pre-implementation. This doc captures decisions made so
far so they survive across separate chats/contexts (backend, admin
dashboard, frontend/PWA) and stay legible to future contributors.

## Purpose

A platform for a shared community space (Münster) to organize:

- Tasks for maintaining the common space
- Booking of resources (meeting rooms, kitchen, cargo bikes, more later)
- Certificates/qualifications as prerequisites for using certain resources
- An internal currency ("repros", from "reproduction") earned by
  contributing and spent to use resources
- Users, who can belong to and/or administrate one or more Initiatives

Funded via Fördergeld → must be open source and reasonably adjustable by
other spaces with different infrastructure (some use Keycloak like bside,
others may have no identity system at all).

## Stack

- **Backend/API**: Laravel (PHP)
- **PWA (end users)**: SvelteKit
- **Admin dashboard**: SvelteKit — same app/stack as the PWA, not a
  separate tool (see "Admin dashboard" below)

Chosen because:

- PHP/Laravel has a low barrier to entry and is very cheap/easy to host
  (shared hosting still works), which matters for volunteer-run spaces
  with little budget or infra — while still working fine in Docker for
  more advanced setups (like ours).
- Laravel's primitives map directly onto the design patterns we want:
  service container bindings (Adapter/Strategy), Policies (access rules),
  Events/Listeners.
- One frontend stack (SvelteKit) for both the PWA and admin views means
  shared components, shared rich-text handling (TipTap), shared
  validation/UI patterns — no duplicate implementations to keep in sync.

## Core design principle: fixed core vs. pluggable boundary

Not everything needs to be adjustable. Only swap what genuinely differs
between spaces; keep the domain logic that *is* the product opinionated
and simple.

### Fixed core (no swapping needed, lives in this app)

- **Ledger / repros system** — the product's core value; double-entry-ish,
  transactional, auditable. Not pluggable by design.
- **Multi-tenancy**: Users ↔ Initiatives, via a pivot with a role
  (`member` / `admin`). A user can belong to and/or administrate multiple
  initiatives.
- **Resource access rules** — "requires certificate X", "costs N repros",
  "initiative members only", "max duration" etc. Modeled as a composable
  rule chain (internal Strategy pattern) attached to each Resource, so
  new rule *instances* are data/config, not code changes. New rule
  *types* are small classes implementing a common interface.
- **Tasks** for space maintenance.

### Pluggable boundary (Adapter/Strategy, swappable per deployment)

Only two things genuinely differ between spaces, so only two contracts
exist:

- **`AuthProviderContract`** — identity/auth. Reference implementations:
  Keycloak/OIDC (e.g. bside), and a trivial local-accounts fallback for
  spaces with no IdP set up yet.
- **`CalendarProviderContract`** — where booking events actually live.
  Reference implementations: internal DB (default), CalDAV, Google
  Calendar.

Selection happens via config/`.env` (service container bindings in
Laravel), so forking spaces adjust behavior without touching core code —
or add a new adapter class if their setup isn't covered yet.

Everything downstream of these two contracts (dashboard, PWA, business
logic) is written against the interface, never against a specific
provider — so admin/PWA UIs don't need per-space adjustability
themselves; they inherit it for free by only talking to the API.

## Admin dashboard decision

Considered Filament (Laravel-native admin panel) vs. building admin views
in SvelteKit. Decided: **SvelteKit**, as route(s) within the same PWA
codebase, gated by role — not a separate app/toolkit.

Reasoning:

- The admin dashboard doesn't need per-space adjustability itself — it
  only ever talks to the Laravel REST API, which already normalized away
  provider differences via the two adapters above. Adjustability lives
  entirely behind that boundary.
- There are two admin tiers: platform-wide admin (rare, small trusted
  group) and initiative-level self-service admin (common — a member
  managing their own initiative's roster/bookings). Both fit naturally as
  authenticated route groups in one app, differentiated by role and
  reachable endpoints, rather than two different UI paradigms.
- One stack means shared components can be reused directly between admin
  and end-user views: TipTap rich-text editor (and its config) for task
  descriptions, resource descriptions, certificate text, initiative
  profiles; date/time pickers for bookings; the resource-rule-builder UI
  itself (used by both platform admins and initiative admins, just at
  different scopes); validation and notification patterns.
- Tradeoff accepted knowingly: more work than Filament's generated CRUD,
  in exchange for UI/UX consistency and no duplicated business-rule
  representation between a generated admin panel and a hand-built PWA.

### Important constraint going forward

Since admin and initiative-admin routes call the *same* REST API as the
PWA, authorization must be enforced server-side via Laravel Policies —
not just by hiding UI elements client-side. A route rendering an admin
button is not an authorization mechanism.

## Fundamentals: Users, Initiatives, Roles, Ledger (decided)

- **User** vs **Profile**: User = account/identity (via `AuthProviderContract`).
  Profile = human-facing display info (name, avatar, bio). Kept distinct
  from auth concerns.
- **Account concept**: a shared conceptual role (not necessarily a DB
  table) that both **User** and **Initiative** fulfill — anything that
  can hold a ledger balance and be the "party" on a booking. User and
  Initiative stay distinct entities (auth, roles, membership differ) but
  both *are-an* Account for ledger/booking purposes.
- **User ↔ Initiative**: many-to-many via a proper relationship entity
  (not just a flag pivot) — a User can belong to zero, one, or many
  Initiatives; standalone use of the platform without any Initiative is
  fully supported. The relationship carries an initiative-scoped role.
- **Roles — flexible by design**: roles are data, not hardcoded
  enums/booleans. Two separate role *scopes*:
    - Platform-scoped roles (assigned to a User directly) — for now just
      `user` / `platform_admin`, but modeled so more roles (e.g.
      "certificate issuer") can be added later without code changes.
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
      Initiative by an organizer, documented via the memo) without needing
      a schema change.
    - **Credit / negative balance**: allowed, bounded. Each Account has a
      credit limit (floor) and, while negative, a `credit_since` timestamp.
      A grace period after which an unsettled negative balance blocks the
      Account from further resource use (`blocked_for_resource_use`-type
      state). Account-standing (blocked or not) is a check independent
      from per-resource access rules (certificates, initiative-only, etc.)
      — two separate rule types that both gate a booking.
    - Open question flagged for backend chat: should transfers (User →
      Initiative) be allowed to push the *sender* negative, or only
      resource spending? Leaning toward: transfers should not be allowed
      to create/increase a negative balance — credit is meant to smooth
      "used a resource before earning enough," not to move balance into
      another account while negative.

## Repo structure (decided)

Monorepo, coupled releases (one version number covers backend + webapp
together, so "which version am I running" stays a single answer even
after other spaces fork and customize adapters).

```
├── apps/
│   ├── backend/      # Laravel API
│   └── webapp/       # SvelteKit — single app: end-user PWA + guarded
│                      # /admin routes (platform-admin and
│                      # initiative-admin both live here, gated by role
│                      # — not a separate dashboard package)
├── docs/             # cross-cutting docs (adapters, deployment, decisions)
├── infra/            # docker, deploy scripts, CI
├── ARCHITECTURE.md    # this file
├── README.md          # project idea, structure, getting started
├── CONTRIBUTING.md
└── LICENSE             # GPL-3.0 (per Stiftung/Fördergeld agreement:
                         # "offene Veröffentlichung unter GPL-3")
```

`apps/` groups the deployable pillars separately from docs/tooling at
the repo root. Each pillar (`apps/backend/`, `apps/webapp/`) gets its own
README for setup/detail; root README stays orientation-level.
`docs/adapters.md` is the key open-source-adoption doc — how to
implement `AuthProviderContract` / `CalendarProviderContract` for a
different space's setup — and should be kept up to date as those
contracts solidify in the backend chat.

### Local dev environment: DDEV

Local development uses [DDEV](https://ddev.com) rather than hand-rolled
Docker Compose, specifically to keep "clone and run" easy for volunteer
contributors at other spaces with varying skill levels. DDEV is
dev/local-only tooling — it has no bearing on how a space actually
deploys to production (cheap shared hosting or self-hosted Docker in
prod are both untouched by this choice).

DDEV config lives per-app (e.g. `apps/backend/.ddev/`), initialized by
running `ddev config` from within that subfolder — not one shared config
at the repo root.

Open question to settle in the backend chat: DDEV's Laravel default is
MariaDB; Postgres is arguably a better fit for the ledger's transactional
needs, but MariaDB/MySQL is far more commonly available on the cheap
shared hosting other spaces may already have. Decide consciously per
reference-deployment goals rather than defaulting silently.

## Open / to revisit in dedicated chats

- Backend chat: entity/schema design for Account/User/Initiative/Role/
  Transaction, `AuthProviderContract` / `CalendarProviderContract`
  concrete implementations, ledger transaction semantics (hold vs.
  charge on cancellation, credit/blocking mechanics), resource-rule
  class design (and how account-standing checks relate to resource
  access rules).
- Admin dashboard chat: route/role structure for platform-admin vs.
  initiative-admin, which components are genuinely shared vs. admin-only.
- Frontend/PWA chat: SvelteKit app structure, TipTap integration/config,
  booking UX, offline/PWA considerations.