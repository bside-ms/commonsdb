# Slice 1 — backend

Identity and profile. Register, sign in, sign out, read and edit your
own profile. Nothing else.

## Before the files: install the API layer

```sh
ddev exec php artisan install:api
```

### Then immediately fix Sanctum's migration

`install:api` publishes `create_personal_access_tokens_table` with:

```php
$table->morphs('tokenable');
```

That makes `tokenable_id` a `BIGINT`. Your users have **UUID** primary
keys. The migration runs fine and then fails at runtime the first time
a token is issued, with an error that points at Sanctum rather than at
the column. Change it to:

```php
$table->uuidMorphs('tokenable');
```

Do this before `migrate`. Catching it afterwards means a second
migration to alter a column inside a polymorphic index.

## Then

```sh
ddev exec php artisan migrate
ddev exec php artisan test --filter=Auth
```

## What's here

| File | Why |
| --- | --- |
| `2026_09_27_100000_align_platform_role_and_add_profiles.php` | renames the role default, adds `profiles` |
| `app/Enums/PlatformRole.php` | `member \| admin \| superadmin` |
| `app/Models/User.php` | + `HasApiTokens`, role cast, profile relation |
| `app/Models/Profile.php` | the human-facing person |
| `app/Auth/RegistersUsers.php` | the two-write transaction |
| `app/Http/Requests/…` | validation, which Scramble reads |
| `app/Http/Resources/…` | the wire shape, which Scramble reads |
| `app/Http/Controllers/Auth/…` | register, session, me |
| `routes/api.php` | five routes |
| `tests/Feature/Auth/…` | 12 tests |

## Decisions made here

**`platform_role` default is now `member`.** `'user'` read like a row
in `users` rather than a role. Migrated in place; no data to worry
about yet.

**Sanctum tokens, not sessions.** The SvelteKit BFF holds the token in
an httpOnly cookie server-side and forwards it as a Bearer header.
Tokens avoid the stateful-domain and CSRF dance that Sanctum's SPA
mode needs, and — the part that matters — Keycloak will also arrive as
a Bearer JWT later, so `$api/client` never changes.

**`profiles` is a separate table.** A Keycloak-backed user has no
password row here but still has a pronoun and an accessibility note.
Identity and personhood have different lifecycles.

**`platform_role` is not fillable.** Role changes are an explicit
superadmin action in slice 4, never mass assignment. There's a test
for it.

**Sign-out revokes one token.** Signing out on a laptop shouldn't sign
you out on your phone. Tested.

**Identical error for unknown-email and wrong-password.** Differing
messages tell an attacker which addresses are registered. Tested by
comparing the two responses rather than asserting a string, so the
property survives a copy change.

**camelCase on the wire, snake_case in the database.** Decided once,
in the Resources, so the generated TypeScript reads like TypeScript.

**`accessibility_note` is free text.** People describe access needs in
their own words. A dropdown of conditions would be both wrong and
intrusive — and it's shown to admins organising a shift, not stored as
a medical record.

## Deliberately not here

- `KeycloakAuthProvider` — the contract binding falls back to local.
Slice 1 doesn't need it, and the b-side's Keycloak work is separate.
- Email verification, password reset — real, but not what the team
wants to see first.
- Policies — nothing to authorise yet beyond "is it you". They arrive
with tasks in slice 2 and matter in slice 4.
- Avatar upload — `photo_visibility` exists, photos don't.

## Then generate the frontend types

```sh
ddev exec php artisan scramble:export --path=storage/app/openapi.json
cd ../webapp && pnpm api:generate
```

Five endpoints is the right size to find out whether the pipeline
works. Check that `UserResource` and `ProfileResource` produced real
TypeScript interfaces rather than `Record
<string, unknown>` — if they
did, Scramble isn't seeing the return types, and it's much easier to
fix now than at thirty endpoints.
