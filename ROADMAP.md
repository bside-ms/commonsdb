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

**Decided:** Tailwind v4 with the theme in
`src/lib/ui/tokens.css`, Bits UI as headless base for the interactive
primitives, `tailwind-variants` for variants, Lucide for icons, Archivo
via fontsource. Native form elements where they suffice. Details,
conventions and component status: `apps/webapp/docs/design-system.md`.

Status: **done**. Tokens, all primitives listed above and the
app shell exist; login, onboarding and profile are built from them.
Visual reference: `apps/webapp/docs/design-system/*.pdf`.

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
- `tasks`: title, description (TipTap), urgent, place, contact,
  self-service, bring, physical demands, `when` (fixed date | range)
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

Status: admin side done (list, create, edit, duplicate, delete/restore,
release, capabilities page for superadmins). Member side next.

**Decided:**

- Roles stay `member | admin | superadmin`. `admin` is the coarse gate
  (hooks, nav); `capabilities (user_id, category_id)` scopes which tasks
  an admin manages. Superadmins need no capabilities. Category is the
  only scope key for now.
- Shift hours are stored as integer tenths (`hours_tenths`, 15 = 1.5 h).
  Repros are hours 1:1, so this settles repro storage for slice 3.
- Shift status codes: `open | taken | reported | confirmed`; German
  wording only in Paraglide.
- `when` is `when_kind` + `starts_on` + `ends_on` (calendar dates, no
  time zone). Delete is a soft delete (`deleted_at`).
- No `steps`. Instructions live in the rich-text description. Structured
  completion criteria (a checklist ticked when reporting) come later as
  their own concept, shared with returning a booked resource.

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

## Slice 6b — Built-in wiki

Pages (title, TipTap content, parent, revisions), Postgres full-text
search, a link picker on tasks. `KnowledgeProvider` port with the
built-in implementation; `knowledge_links` table used by later slices
for resources and qualifications. Markdown export per page.

Outline adapter: later, when a space needs it (B-Side: once the
built-in version has shown what's actually used).

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

- **Repro storage.** Fractional values (0.5) mean decimal or integer
  tenths. Integer tenths avoids float drift in balance sums — decide
  before slice 3, it's the one thing here that's expensive later.
- **Registration.** Self-serve with a rules checkbox, per the prototype.
  Whether admins approve is unresolved.
- **Ledger entry shape.** Theirs is single-entry signed amounts. Ours
  was double-entry. Single-entry with an account reference is fine until
  transfers exist in slice 9 — but decide knowingly.
- **Tenant grace.** Guidance or enforcement? Their copy says a minus is
  normal and not an error.
- **Wiki permissions.** Built-in pages visible to all members, editable
  by admins? Or editable by everyone, with revisions as the safety net?
- **Completion criteria.** A checklist ticked when reporting a task or
  returning a resource. Same concept for both; model it when the first
  of them needs it.

---

## Cross-cutting, not slices

Handled inside whichever slice first needs them:

- PWA shell, offline behaviour, install prompt
- Notification delivery (email first; preference fields exist from
  slice 1)
- Seed data mirroring the prototype, kept working as a demo fixture