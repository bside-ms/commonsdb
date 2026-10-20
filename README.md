# B-Side commonsdb

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

| Part     | Technology        | Why                                                                  |
| -------- | ----------------- | -------------------------------------------------------------------- |
| API      | Laravel (PHP)     | Widely known, readable, cheap to host, mature and actively developed |
| Web app  | SvelteKit         | One app for members and admins (role-gated `/admin` routes)          |
| Login    | Pluggable adapter | Built-in local accounts, or your own OIDC provider (we use Keycloak) |
| Calendar | Pluggable adapter | Built-in, or an existing calendar via CalDAV etc.                    |

## Repository structure

```
commonsdb/
├── apps/
│   ├── api/              Laravel API           → apps/api/README.md
│   └── webapp/           SvelteKit web app     → apps/webapp/README.md
├── docs/                 Cross-cutting docs    → docs/README.md
├── ARCHITECTURE.md       How the system is built and why
├── ROADMAP.md            What gets built in which order
├── CONTRIBUTING.md       How to contribute
├── LICENSE               GPL-3.0-or-later
├── docker-compose.yml    Local services (Keycloak for login testing)
└── Makefile              Shortcuts for the local services
```

## Where to find what

| You want to …                                 | Read                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| get an overview                               | this README                                                                              |
| understand the system and its decisions       | [ARCHITECTURE.md](ARCHITECTURE.md)                                                       |
| know what comes next                          | [ROADMAP.md](ROADMAP.md)                                                                 |
| run it with your own login or calendar system | [docs/adapters.md](docs/adapters.md)                                                     |
| set up the API or the web app locally         | [apps/api/README.md](apps/api/README.md), [apps/webapp/README.md](apps/webapp/README.md) |
| contribute                                    | [CONTRIBUTING.md](CONTRIBUTING.md)                                                       |

## Adapting it for your space

Only two things differ between spaces: how people log in, and where
calendar data lives. Those are swappable adapters. Everything else
(tasks, repros, initiatives, resource rules) works the same everywhere.
Start at [docs/adapters.md](docs/adapters.md).

## Getting started

Local development uses [DDEV](https://ddev.com), set up per app. See
[apps/api/README.md](apps/api/README.md) and
[apps/webapp/README.md](apps/webapp/README.md). DDEV is local tooling
only and does not affect how the platform is deployed.

## Releases & versioning

API and web app are released together under one version number, so
"which version am I running?" has a single answer, even after a space has
customized its adapters.

## License

Copyright © B-Side Münster and contributors.

This program is free software: you can redistribute it and/or modify it
under the terms of the GNU General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option)
any later version. See [LICENSE](LICENSE).
