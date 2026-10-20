# API (Laravel)

The backend of commonsdb: a REST API for users, initiatives, tasks and
the repro ledger. Part of the [commonsdb monorepo](../../README.md).

## Local setup

Requires [DDEV](https://ddev.com).

```sh
cd apps/api
ddev start
ddev composer install
cp .env.example .env
ddev exec php artisan key:generate
ddev exec php artisan migrate
```

Run the tests:

```sh
ddev exec php artisan test
```

## Login providers

Login goes through `AuthProviderContract` (`app/Auth/`). The default is
local accounts (`LocalAuthProvider`). For other providers, see
[docs/adapters.md](../../docs/adapters.md).

## Docs

- [docs/slice-1.md](docs/slice-1.md) — slice 1: sign-in and profile

## License

GPL-3.0-or-later, see [LICENSE](../../LICENSE).
