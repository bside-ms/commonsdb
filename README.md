# B-Side commonsdb
Status: early development / pre-release.

<!-- One paragraph: what this is, for whom, in plain language. Written for someone from another space who lands here via a search engine, not just for us. -->
Idea
<!-- Short version of ARCHITECTURE.md's "Purpose" section: - tasks for maintaining a shared space - booking system for resources (rooms, kitchen, cargo bikes, ...) - certificates/qualifications as prerequisites for resource use - an internal currency ("repros") earned by contributing, spent to use resources - users, and initiatives/organizations users can belong to or admin Link out to ARCHITECTURE.md for the full picture. -->
Why open source
<!-- Fördergeld context, "offene Veröffentlichung unter GPL-3" per the Stiftung agreement — briefly, factually. Link to LICENSE. -->
Repo structure
├── apps/
│   ├── backend/     # Laravel API
│   └── webapp/      # SvelteKit — end-user PWA + guarded /admin routes
├── docs/            # cross-cutting docs (adapters, deployment, decisions)
├── infra/           # docker, deploy scripts, CI
├── ARCHITECTURE.md   # conceptual/architectural decisions, living doc
└── CONTRIBUTING.md

Each pillar (apps/backend/, apps/webapp/) has its own README with setup and pillar-specific docs. This root README is for orientation, not detail.

Adapting this for your space

If you're running a different identity provider or calendar system than we are, start at docs/adapters.md — the platform is built so only auth and calendar integration need to change; everything else (ledger, tasks, initiatives, resource rules) works the same.

Getting started

Local development uses DDEV per app (see apps/backend/README.md for the backend quickstart). DDEV is dev/local tooling only — it doesn't affect how the project is deployed in production; see docs/deployment/ for that.

<!-- Fill in once apps/webapp/ setup is decided too. -->
Releases & versioning

Pillars are released together — one version number covers the whole monorepo (backend + app), so "which version am I running" is a single answer even after a space has forked and customized their adapters.

Infrastructure
<!-- Our own deployment notes / what we run in production, vs. what other spaces might realistically run (cheap shared hosting vs. docker). Link to docs/deployment/. -->
License

GPL-3.0. See LICENSE.

Contributing

See CONTRIBUTING.md.