# webapp

SvelteKit app: member PWA and the guarded `/admin` area. Thin routes
that call `@commonsdb/core`; see the root `ARCHITECTURE.md`.

## Develop

From the repo root: `docker compose up -d db`, `pnpm install`, then

    pnpm --filter webapp dev

| Script           | What it does                                                           |
| ---------------- | ---------------------------------------------------------------------- |
| `dev`            | dev server; `/dev/ui` shows all UI components                          |
| `check`          | svelte-check / TypeScript                                              |
| `lint`, `format` | prettier + eslint                                                      |
| `test:e2e`       | Playwright against a production build; needs `pnpm db:up` (see `e2e/`) |

## Where things are

| Path                         |                                                           |
| ---------------------------- | --------------------------------------------------------- |
| `src/routes/**/*.remote.ts`  | remote functions (query/form); each authorizes itself     |
| `src/lib/ui/`                | design system: tokens + components, import from `#lib/ui` |
| `src/lib/navigation.ts`      | member and admin nav items                                |
| `src/lib/format.ts`          | dates and hours for display                               |
| `src/lib/components/`        | domain components used by several routes (`TaskCard`)     |
| `src/lib/server/services.ts` | composition root (db, auth)                               |
| `src/lib/server/guards.ts`   | `requireActor/Admin/Superadmin`, core errors → HTTP/form  |
| `src/lib/i18n/errors.ts`     | core error code → message                                 |
| `messages/de.json`           | all UI text (Paraglide)                                   |
| `docs/design-system.md`      | design system conventions and status                      |
| `e2e/`                       | Playwright tests, setup, fixtures (`as('kim')`)           |
