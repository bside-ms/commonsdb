# Adapting this platform for your space

This is the single most important doc for anyone forking this project for
their own space. Everything else in this repo describes *our* instance;
this page describes how to make it *yours* without touching core code.

Status: stub, to be filled in as the backend's adapter contracts solidify.

## The idea

Two things reliably differ between community spaces: how people log in,
and where booking/calendar data lives. Everything else — tasks, the
repro ledger, initiatives, resource access rules — is provided by the
platform itself and works the same regardless of your setup.

You adjust the platform by:

1. Setting a couple of `.env` values if your setup matches an existing
   adapter (e.g. Keycloak, CalDAV), or
2. Writing a small class implementing one of the two contracts below if
   it doesn't.

No fork-wide code changes needed either way.

## `AuthProviderContract`

*(to be filled in: method signatures, what a minimal implementation
needs to provide, reference to `KeycloakAuthProvider` /
`LocalAuthProvider` as examples)*

Use this if your space:

- Already runs Keycloak or another OIDC provider → likely just
  config, see `backend/README.md`
- Has no identity system yet → use the local-accounts fallback as a
  starting point
- Runs something else entirely → implement the contract; see
  `LocalAuthProvider` as the simplest reference implementation

## `CalendarProviderContract`

*(to be filled in: method signatures, what a minimal implementation
needs to provide, reference to `InternalCalendarProvider` /
`CalDavCalendarProvider` / `GoogleCalendarProvider` as examples)*

Use this if your space:

- Wants bookings to just live in the platform's own database → use
  the internal provider (default)
- Already has a shared calendar system (CalDAV, Google Calendar, etc.)
  you want bookings to sync with → implement or reuse the matching
  adapter

## Writing a new adapter

*(to be filled in as the contracts stabilize: checklist, testing
expectations, where to submit it if you'd like it merged upstream for
others to reuse)*

## What you don't need to adapt

The following are intentionally *not* pluggable — they're the actual
product, not infrastructure glue, and should work the same everywhere:

- Users, Initiatives, and the relationship between them
- The repro ledger
- Resource access rules (certificates, cost, membership, duration —
  these are configured as data per resource, not code)
- Tasks

If something here genuinely doesn't fit your space, that's worth an
issue/discussion upstream rather than a local fork-only change — the
goal is for improvements to flow back.