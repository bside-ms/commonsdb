# Slice 1 — frontend

Sign in, register, sign out, edit your own profile.

## File placement

```
apps/webapp/
├── .env                                    from .env.example
└── src/
    ├── app.d.ts                            locals.accessToken
    ├── hooks.server.ts                     cookie → locals
    ├── lib/
    │   ├── server/api/session.ts           the cookie itself
    │   └── features/
    │       ├── auth/
    │       │   ├── index.ts
    │       │   ├── api/auth.remote.ts
    │       │   └── components/{SignInForm,RegisterForm}.svelte
    │       └── profile/
    │           ├── index.ts
    │           ├── api/profile.remote.ts
    │           └── components/ProfileForm.svelte
    └── routes/
        ├── +layout.svelte                  app.css + Toaster
        ├── +page.server.ts                 redirect in or out
        ├── (auth)/
        │   ├── +layout.svelte              no shell
        │   ├── sign-in/+page.svelte
        │   └── register/+page.svelte
        └── (app)/
            ├── +layout.server.ts           the gate
            ├── +layout.svelte              AppShell
            └── profile/+page.svelte
```

`/tasks` doesn't exist until slice 2. Either add a placeholder
`(app)/tasks/+page.svelte` or point `paths.tasks` at `/profile`
temporarily, or signing in lands on a 404.

## How the BFF actually works

1. `signIn` runs **on the server**. It calls Laravel, gets a token,
   and writes it to an httpOnly cookie.
2. The browser receives a cookie it cannot read. No token in
   `localStorage`, none in a JS variable, nothing for an XSS to steal.
3. On every later request `hooks.server.ts` lifts the cookie onto
   `locals.accessToken`.
4. `$api/client` reads `locals.accessToken` and sends it to Laravel as
   a Bearer header.

The browser never learns Laravel's URL. That's why `API_BASE_URL` has
no `PUBLIC_` prefix — if it ever needs one, something has been wired
backwards.

## Decisions here

**Commands return a result, they don't throw.** A wrong password is an
expected outcome the form has to render, not an error page. Unexpected
failures still throw and hit the error boundary. That's what
`asResult()` is doing: `ApiError` becomes data, everything else
rethrows.

**The user is loaded in `(app)/+layout.server.ts`, not in hooks.**
Hooks run on every request including static assets; loading there
would mean a round trip to Laravel for every favicon. The layout runs
once per navigation into the app.

**A 401 from `/me` is treated as signed out.** An expired or revoked
token sends the person to sign-in rather than showing a broken shell.

**Sign-out clears the cookie even if the API call fails.** Otherwise a
token Laravel has already forgotten leaves the person stuck in a
session that doesn't exist.

**Validation happens twice, on purpose.** Valibot in the remote
function guards the HTTP boundary; Laravel's FormRequests are the real
authority. The frontend schemas exist to give fast feedback and to
stop malformed payloads, not to replace server validation.

**Field errors come from Laravel, keyed by field name.** That's why
the camelCase alignment mattered: `error.fields.displayName` maps
straight onto the `FormField` for `displayName`. No translation layer.

**Forms use `onsubmit` + `command()` rather than `form()`.** The
remote `form()` primitive would be less code, but this way the error
mapping into `FormField` is explicit and easy to follow. Worth
revisiting once the pattern has settled — probably in slice 2, where
the admin task form is bigger.

## German copy

Interface German, sentence case, active voice. Actions keep their name
through the flow: the button says "Speichern", the toast says "Profil
gespeichert". The accessibility question is phrased as a question
about what would help, not a form field asking for a condition.

## Try it

```sh
cp .env.example .env
pnpm dev
```

Register at `/register`. Check in devtools that the `commonsdb_token` cookie
is marked HttpOnly, and that no request from the browser goes to
`commonsdb.ddev.site` — every call should be to the SvelteKit origin.

## Next

The e2e spec in `e2e/task-flow.spec.ts` is written for slice 2, so it
still fails. A slice-1 spec worth adding now: register → land in the
app → edit profile → sign out → sign in again and see the change.