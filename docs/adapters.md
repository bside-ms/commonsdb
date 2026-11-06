# Adapting this platform for your space

This is the single most important doc for anyone forking this project for
their own space. Everything else in this repo describes *our* instance;
this page describes how to make it *yours* without touching the domain
logic.

Status: stub, to be filled in as the interfaces in `packages/core`
solidify.

## The idea

Two things reliably differ between community spaces: how people log in,
and where booking/calendar data lives. Everything else — tasks, the
repro ledger, initiatives, resource access rules — is provided by the
platform itself and works the same regardless of your setup.

You adjust the platform by:

1. Setting environment variables and auth configuration if your setup
   matches something already supported (e.g. Keycloak/OIDC, CalDAV), or
2. Writing a small adapter implementing the relevant interface if it
   doesn't.

## Authentication

Authentication is handled by Better Auth, configured per deployment.

*(to be filled in: required env variables, example configs)*

- **You run Keycloak or another OIDC provider** → configure the OIDC
  provider (issuer, client id/secret, role/group mapping).
- **You have no identity system yet** → enable email/password; nothing
  else to run.
- **Something else** → Better Auth supports further providers; the
  domain only depends on a small "current identity" port, so swapping is
  contained.

*(to be filled in: how external roles/groups map to platform roles)*

## `CalendarProvider`

*(to be filled in: interface definition, what a minimal implementation
must provide — availability check, create/cancel booking — and
reference implementations)*

- **Bookings live in the platform's own database** → use the internal
  provider (default).
- **You already have a shared calendar system** (CalDAV, Google
  Calendar, ...) → use or write the matching adapter.

## Writing a new adapter

*(to be filled in as the interfaces stabilize: checklist, testing
expectations, how to register it in the composition root, where to submit
it if you'd like it merged upstream for others to reuse)*

## What you don't need to adapt

The following are intentionally *not* pluggable — they're the actual
product, not infrastructure glue, and should work the same everywhere:

- Users, Initiatives, and the relationship between them
- The repro ledger
- Resource access rules (certificates, cost, membership, duration —
  configured as data per resource, not code)
- Tasks

If something here genuinely doesn't fit your space, that's worth an
issue/discussion upstream rather than a local fork-only change — the
goal is for improvements to flow back.