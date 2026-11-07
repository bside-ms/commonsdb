# Roadmap — feature slices

Companion to `ARCHITECTURE.md`. That document holds *decisions*; this one
holds *order*. Written after reviewing the design team's prototype
(`b-side_prototyp_aktuell.html`).

Working constraint: one developer, backend and frontend built together
per slice, so the rest of the team sees a working thing at the end of
each slice rather than a half-built layer.

## How we treat the prototype

The prototype is **directional, not a specification**. The design side is
still moving, and the ideas are good enough to follow — but we build to
the *shape* they implied, not to their current screens.

Practically this means a standing rule for every slice:

- **Model what they implied, even if we don't show it.** Structures that
  would be expensive to retrofit go into the schema now, with the UI
  collapsed to the simple case.
- **Don't build UI they haven't settled.** If a screen is still being
  argued about, ship the simplest thing that works and wait.
- **Write the decision down when we notice it, decide it later.** The
  "Noticed, not decided" list below is where those go.

The clearest example is **shifts**. Their model — a task has many shifts,
each with its own time window, hours and assignee — is almost certainly
right and would be painful to add later. So the tables exist from slice
2, every task gets exactly one shift, and the UI says "übernehmen" on the
task. Multi-shift UI is a later, cheap slice.

## Principle

Each slice is a **vertical cut**: migration + model + policy + API
endpoint + SvelteKit route + UI. No slice ends with an API nobody calls
or a screen backed by mock data.

A slice is done when someone who isn't a developer can log into staging
and use it.

---

## Scope correction from the prototype

The prototype narrows v1 considerably. Deferred out of v1, visible there
as teaser content only: **resource booking**, **initiatives**,
**qualifications/certificates**.

So `CalendarProviderContract` is not needed for v1 at all.
`AuthProviderContract` still is — it gates slice 1.

---

## Slice 0 — Design system, first pass

Lives in `apps/webapp/src/lib/ui/`. Not a separate package, not
Storybook-first, not a full library. It grows with the slices.

Build only what slices 1 and 2 actually need:

- **Tokens**: colour (including the prototype's member colour accents:
  pink, green, orange, blue, yellow), spacing scale, type scale, radii,
  focus ring. CSS custom properties, defined once.
- **Primitives**: Button, Input, Select, Textarea, Checkbox, Label,
  FormField (label + hint + error, since every form needs the same error
  treatment), Card, Badge/Chip, Avatar, Modal, Toast, EmptyState.
- **Layout**: the app shell — header, nav, content area — as one
  component with the member/admin variants as props, not two shells.

Rules that keep it from rotting:

- A component enters the library on its **second** use, not its first.
  Until then it lives in the route that needs it.
- No component takes a `variant` prop with more than three values without
  a conversation.
- Accessibility is part of the primitive, not the caller's job: focus
  management in Modal, `aria-describedby` wiring in FormField, visible
  focus rings everywhere.
- The prototype has a font-size switcher and accessibility notes on user
  profiles. Whatever they settle on, it has to work through tokens — so
  no hardcoded `px` font sizes anywhere in the app.

Done when slice 1's screens are built entirely from it.

**Decided (Nov 2026):** Tailwind v4 with the theme in
`src/lib/ui/tokens.css`, Bits UI as headless base for the interactive
primitives, `tailwind-variants` for variants, Lucide for icons, Archivo
via fontsource. Native form elements where they suffice. Details,
conventions and component status: `apps/webapp/docs/design-system.md`.

Status: tokens, Button, FormField, Input, Textarea, Select, Checkbox
done (profile fields use them). Next: Card, Badge/Chip, Avatar, Modal,
Toast, EmptyState, AppShell — then restyle login, onboarding and profile.

---

## Slice 1 — Identity and profile

Builds on the `users` table and `LocalAuthProvider` already in place.

- Login, logout, session/token issuance through `AuthProviderContract`
- Registration flow. The prototype's signup collects name, pronoun,
  email, phone, accessibility note, interests, privacy/visibility, photo
  visibility, notification preferences — collect the fields, they're
  cheap, but don't build behaviour on them yet.
- Profile view + edit, settings screen
- `platform_role` as `member | admin | superadmin`

Demo: a colleague registers, logs in, edits their profile.

---

## Slice 2 — Tasks: admin creates, member grabs

The heart of the reslice. One loop, both sides, minimum ceremony.

**Schema (fuller than the UI):**

- `super_categories`, `categories`
- `tasks`: title, description, urgent, place, contact, self-service,
  bring, physical demands, `when` (fixed date | range), `steps` blocks
- `shifts`: task, start, end, hours, status, assignee — one row per task
  for now
- `capabilities`: which categories an admin is responsible for

**Admin UI:** task list, create, edit, duplicate, delete/restore. The
form covers the fields above; the shift part is just "how many hours".

**Member UI:** task list with search and category filter, task detail,
and a single primary action — take it, or release it.

Deliberately *not* here: multi-shift UI, urgent-first/doable-now/
together-only filters, reporting completion, the ledger, series.

Demo: an admin puts a real task in, a member takes it, both see it.

---

## Slice 3 — Report, confirm, repros

Closes the loop and introduces the ledger.

- Report completion with a note (`angenommen` → `gemeldet`)
- Admin confirmation queue, scoped by category capability
  (`gemeldet` → `bestaetigt`), writing a ledger entry
- `ledger_entries`: account, signed amount, reason, task/shift reference,
  timestamp, acting user, manual flag
- Account screen; "thanks" record on confirmation

Repro equals shift hours, 1:1, fractional to at least 0.5.

Keep the `Account` indirection from `ARCHITECTURE.md` even though only
users hold balances in v1 — one extra table now, no migration when
initiatives arrive.

Demo: end to end. Take, do, report, confirm, repros land.

---

## Slice 4 — Multi-shift tasks

The first "unfold what we already modelled" slice. Cheap because the
tables already exist.

- Several shifts per task, with individual time windows
- Shift templates on the admin task form
- Member view: who else is on this shift, free slots, parallel slots
- The prototype's richer filters (urgent-first, doable-now,
  together-only)

---

## Slice 5 — Recurring series

- `task_series`: the rule — task fields as template, repeat mode, anchor,
  until, paused, lookahead, shift templates
- Repeat modes: weekly, biweekly, monthly (nth-weekday or day-of-month
  window), every N days **from the last actual completion**, manual
- Generator producing occurrences up to `lookahead` ahead, honouring
  `minGap`. The completion-relative mode makes this stateful: it must run
  after every confirmation, not only nightly.
- Series health view for admins; members only ever see occurrences

---

## Slice 6 — Messaging

`threads` (subject, kind, optional task reference, participants,
`claimed_by`, archived) and `messages` with per-user read tracking.
Member inbox, admin inbox with claiming, direct messages respecting
`dm_open` and block lists.

Self-contained — can move earlier or later freely.

---

## Slice 7 — Around the edges

Small, mostly CRUD, high visible value: suggestions (member reports
something, admin converts it into a task), news on the start page, the
superadmin-editable "About" page.

---

## Slice 8 — Tenant charges

Tenant flag, tenant-since, rented space. Monthly automatic debit,
idempotent per user-month via a unique key on the ledger entry. Grace
period surfaced as guidance, not as a block.

Not the credit gate we designed for bookings — a negative balance is
normal here. The gate comes with slice 10.

---

## Slice 9 — Initiatives

Initiatives as ledger-holding accounts, membership with per-initiative
roles, user-to-initiative transfers with a memo field.

---

## Slice 10 — Resources and booking

`CalendarProviderContract` plus its internal-DB implementation,
resources, booking rules, spending from a user or initiative account, and
the account-standing check that blocks booking.

---

## Slice 11 — Qualifications

Certificates gating tasks and resources.

---

## Noticed, not decided

Things the prototype implies that we should *not* settle yet. Revisit
when the design side stabilises.

- **Admin scoping.** Their admins are scoped to *categories*
  (`u2: cats c5–c8`), not to functional areas or initiatives. Third shape
  we've seen. The `capabilities` table in slice 2 is built for it, but
  whether category is the only scope key stays open.
- **Three roles or two plus capabilities.** They show
  `mitglied | admin | ueberadmin`. We may end up with `member |
  superadmin` plus capabilities, and "admin" is just "has capabilities".
- **Repro storage.** Fractional values (0.5) mean decimal or integer
  tenths. Integer tenths avoids float drift in balance sums — decide
  before slice 3, it's the one thing here that's expensive later.
- **`steps` storage.** Typed JSON column with server-side block
  validation, or its own table. JSON likely, since blocks are always read
  whole. Their block set (heading/text/photo/link) is narrower than the
  TipTap plan — good, easier to validate.
- **Registration.** Self-serve with a rules checkbox, per the prototype.
  Whether admins approve is unresolved.
- **Ledger entry shape.** Theirs is single-entry signed amounts. Ours
  was double-entry. Single-entry with an account reference is fine until
  transfers exist in slice 9 — but decide knowingly.
- **Tenant grace.** Guidance or enforcement? Their copy says a minus is
  normal and not an error.
- ~~**Language.**~~ Decided: German-only, every string through Paraglide
  (see ARCHITECTURE.md, "Conventions across the stack"). UI components
  follow the same rule (`ui_*` message keys).

---

## Cross-cutting, not slices

Handled inside whichever slice first needs them:

- PWA shell, offline behaviour, install prompt
- Notification delivery (email first; preference fields exist from
  slice 1)
- Seed data mirroring the prototype, kept working as a demo fixture