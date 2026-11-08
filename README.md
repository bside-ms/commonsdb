# CommonsDB

[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg)](LICENSE)
![Status: early development](https://img.shields.io/badge/status-early%20development-orange.svg)

A platform for running a shared community space together. It is built for
the B-Side in Münster and designed so that other
spaces can run their own copy with their own login and calendar systems.

> **Status:** early development / pre-release. Not ready for production use.

## What it does

- **Tasks** for maintaining the shared space, split into shifts that
  members can take on
- **Repros**, an internal time currency: earned by contributing, spent to
  use resources
- **Users and initiatives**: people can belong to and run one or more
  initiatives (groups) within the space
- **Resources and bookings** (rooms, kitchen, cargo bikes, …), with access
  rules such as required qualifications _(planned after the first release)_

The full picture, including design decisions, is in
[ARCHITECTURE.md](ARCHITECTURE.md).

## Why open source

The project is published openly under the GPL-3.0, so that other community spaces can
use, adapt and improve it, and improvements flow back.

## Stack

TypeScript end to end: SvelteKit, Drizzle + Postgres, Better Auth. The domain logic (ledger, resource rules, tasks,
initiatives) lives in a framework-agnostic package so the app can be sliced later (e.g. a separate API) without a
rewrite. Details and trade-offs in ARCHITECTURE.md.

## Repository structure

```
├── apps/
│   └── webapp/        # SvelteKit — PWA + guarded /admin routes
├── packages/
│   ├── core/          # domain logic: services, policies, validation
│   ├── db/            # Drizzle schema + migrations
│   ├── auth/          # Better Auth setup
│   └── richtext/      # TipTap profiles, validation, rendering
├── docs/              # cross-cutting docs (adapters, …)
├── docker-compose.yml # Postgres (+ optional local Keycloak)
├── ARCHITECTURE.md    # conceptual/architectural decisions, living doc
├── ROADMAP.md         # order of work, slice by slice
└── CONTRIBUTING.md
```

Each app/package has its own README with setup and specifics. This root
README is for orientation, not detail.

## Adapting this for your space

If you're running a different identity provider or calendar system than
we are, start at [`docs/adapters.md`](docs/adapters.md) — only auth
configuration and calendar integration differ between spaces; everything
else (ledger, tasks, initiatives, resource rules) works the same.

## Getting started

You need Node 24+, pnpm and Docker.

```sh
pnpm install
cp .env.example .env      # set BETTER_AUTH_SECRET; for local accounts
                          # AUTH_EMAIL_PASSWORD=true
pnpm db:up                # Postgres in docker
pnpm db:migrate
pnpm db:seed              # demo categories
pnpm dev                  # http://localhost:5173
```

New users start as members. To make yourself superadmin:
`update "user" set platform_role = 'superadmin' where email = '…';`

```sh
pnpm check                # types
pnpm test                 # core + richtext tests (no database needed)
pnpm test:e2e             # browser tests (needs pnpm db:up; first time:
                          # pnpm --filter webapp exec playwright install chromium)
```

## Releases & versioning

Everything is released together — one version number covers the whole
monorepo, so "which version am I running" is a single answer even after a
space has forked and customized their adapters.

## Infrastructure

The reference deployment is Docker or a small VPS: the SvelteKit app
(Node), a background worker, and Postgres. Cheap shared PHP-style hosting
is not a target. <!-- Our own production notes; link to docs/deployment/. -->

## License

GPL-3.0. See [LICENSE](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
