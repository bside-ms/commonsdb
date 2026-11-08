# Contributing

Thanks for your interest! The project is in early development, so the
best way to start is to open an issue before writing larger changes.

## Ways to help

- **Report bugs or ideas** as a GitHub issue
- **Improve the docs**: unclear setup steps are bugs too
- **Write an adapter** for a login or calendar system we don't support
  yet, see [docs/adapters.md](docs/adapters.md)

## Before you open a pull request

1. Read [ARCHITECTURE.md](ARCHITECTURE.md). It explains which parts are
   fixed and which are meant to be swapped.
2. Check [ROADMAP.md](ROADMAP.md) for what is planned next.
3. Keep changes focused: one topic per pull request.
4. Run `pnpm check` and `pnpm test`. If you changed UI or a flow, also
   `pnpm test:e2e`. New rules in `core` come with a test.
5. If you change a decision, update ARCHITECTURE.md in the same pull
   request.

## Where documentation goes

| Kind of information          | Place                                         |
| ---------------------------- | --------------------------------------------- |
| Overview, orientation        | `README.md`                                   |
| System design and decisions  | `ARCHITECTURE.md`                             |
| Order of work                | `ROADMAP.md`                                  |
| Topics spanning both apps    | `docs/`                                       |
| Setup and details of one app | `apps/<app>/README.md` and `apps/<app>/docs/` |

## License

By contributing, you agree that your contributions are licensed under the
GPL-3.0-or-later, like the rest of the project.
