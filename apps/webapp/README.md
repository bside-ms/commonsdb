# webapp

SvelteKit app: member PWA and the guarded `/admin` area. Thin routes
that call `@commonsdb/core`; see the root `ARCHITECTURE.md`.

## Develop

From the repo root: `docker compose up -d db`, `pnpm install`, then

    pnpm --filter webapp dev

| Script           | What it does                                  |
| ---------------- | --------------------------------------------- |
| `dev`            | dev server; `/dev/ui` shows all UI components |
| `check`          | svelte-check / TypeScript                     |
| `lint`, `format` | prettier + eslint                             |
| `test:e2e`       | Playwright                                    |

## Where things are

| Path                         |                                                           |
| ---------------------------- | --------------------------------------------------------- |
| `src/lib/ui/`                | design system: tokens + components, import from `#lib/ui` |
| `src/lib/navigation.ts`      | member and admin nav items                                |
| `src/lib/server/services.ts` | composition root (db, auth)                               |
| `src/lib/i18n/errors.ts`     | core error code → message                                 |
| `messages/de.json`           | all UI text (Paraglide)                                   |
| `docs/design-system.md`      | design system conventions and status                      |
