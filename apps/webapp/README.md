# Web app (SvelteKit)

The app members and admins use. Admin views are role-gated routes in the
same app, not a separate tool. Part of the
[commonsdb monorepo](../../README.md).

## Local setup

Requires Node.js and [pnpm](https://pnpm.io). The API should be running
(see [apps/api](../api/README.md)).

```sh
cd apps/webapp
pnpm install
cp .env.example .env
pnpm dev
```

Tests:

```sh
pnpm test:unit   # unit and component tests (Vitest)
pnpm test:e2e    # end-to-end tests (Playwright)
pnpm test        # both
```

## Docs

- [docs/structure.md](docs/structure.md) — how the code is organised
- [docs/setup.md](docs/setup.md) — setup notes and fixes to the generated project
- [docs/groundwork.md](docs/groundwork.md) — API types from OpenAPI, testing habits
- [docs/slice-1.md](docs/slice-1.md) — slice 1: sign-in and profile

## License

GPL-3.0-or-later, see [LICENSE](../../LICENSE).
