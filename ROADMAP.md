# Roadmap — feature slices

Companion to `ARCHITECTURE.md`. That document holds _decisions_; this one
holds _order_. Written after reviewing the design team's prototype
(`b-side_prototyp_aktuell.html`).

Working constraint: one developer, backend and frontend built together
per slice, so the rest of the team sees a working thing at the end of
each slice rather than a half-built layer.

## How we treat the prototype

The prototype is **directional, not a specification**. The design side is
still moving, and the ideas are good enough to follow — but we build to
the _shape_ they implied, not to their current screens.

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

Status: **done.** Login/logout through Better Auth against Keycloak,
onboarding (profile fields + house rules) instead of in-app
registration, profile view and edit, `platform_role` in the session.
Tested in core (integration, PGlite) and end to end.

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

Deliberately _not_ here: multi-shift UI, urgent-first/doable-now/
together-only filters, reporting completion, the ledger, series.

Demo: an admin puts a real task in, a member takes it, both see it.

Status: **done.** Admin side (list, create, edit, duplicate,
delete/restore, release, capabilities for superadmins), member side (list
with search and category filters, detail, take/release, "Meine Aufgaben"
on the start page). Tested in core (integration, PGlite) and end to end
(Playwright against a production build and real Postgres).

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

Status: **done.** Members report with an optional note; admins confirm
(hours correctable, optional thanks) or send back with a reason, in a
queue scoped by category capability. Confirming credits the ledger in
the same transaction. Members see their balance on the start page and
their entries at `/account`; superadmins correct balances at
`/admin/members`. Tested in core (integration, PGlite) and end to end
(`e2e/repros.e2e.ts`).

**Decided:**

- Ledger is single-entry and append-only: one signed amount per row on
  one account, balance = sum. Corrections are new entries (a trigger
  rejects UPDATE/DELETE). Transfers (slice 9) will be two entries sharing
  a `transfer_id`.
- Amounts in integer tenths (`amount_tenths`), like `hours_tenths`.
- `kind` (`shift_credit | adjustment`) replaces the manual flag; `memo`
  is the free-text reason, required for adjustments.
- One credit per shift, guaranteed by a partial unique index.
- Accounts are created lazily on first credit; no account = balance 0.
- `actor_id` on entries has no FK: an audit field that survives user
  deletion without touching immutable rows.
- `credit_limit` / `credit_since` wait for slices 8/10 (cheap to add).
- The table is `ledger_account` (export `ledgerAccount`): `account`
  belongs to Better Auth (IdP links). Conceptually it is still the
  `Account` from ARCHITECTURE.md.
- Shift gets `reported_at`, `report_note`, `send_back_note`,
  `confirmed_at`, `confirmed_by`, `confirm_note` (one migration).
  `confirmed_by` has no FK (audit field). A superadmin confirming her
  own shift stays visible as `confirmed_by = assignee_id`.
- Report note optional (max 1000). Admins may send a report back
  (`reported → taken`, reason required) and correct the hours while
  confirming; hours are locked once confirmed. Thanks = optional
  `confirm_note`. Admins can't confirm their own shifts, superadmins can.
- Send-back keeps only the latest reason; reporting again clears it.
  A history (`shift_event`) waits until someone needs it.
- Members see their own shifts in the task list until confirmed; done
  work lives on the account screen.
- Confirming is one transaction (conditional `reported → confirmed` +
  ledger credit); the confirmed hours are what gets credited.
  Confirmation logic lives in `core/src/tasks/confirmation.ts`, the only
  task code that imports the ledger.
- The queue includes soft-deleted tasks; oldest report first.
- No assignee (user deleted after reporting) → no credit
  (`shift_no_assignee`); send back or delete.
- Account screen at `/account` ("Konto" in the member nav): balance,
  latest 50 entries, thanks inside the entry it belongs to. The start
  page shows the balance as a link. `Balance` moved to `lib/ui`
  (second use).
- Manual adjustments: superadmins, at `/admin/members` (minimal list:
  name, email, role, balance). Signed half steps, ±1000, memo required
  and shown to the member. Fixed by another adjustment, never edited.
  Superadmins may adjust their own balance; `actor_id` records it.
- Only `confirmation.ts` and `ledger/admin.ts` write ledger entries.

---

## Slice 4 — Multi-shift tasks

The first "unfold what we already modelled" slice. Cheap because the
tables already exist.

- Several shifts per task, with individual time windows
- Shift templates on the admin task form
- Member view: who else is on this shift, free slots, parallel slots
- The prototype's richer filters (urgent-first, doable-now,
  together-only)

**Decided:**

- Shift windows are local times of day (`starts_time`, `ends_time`,
  Postgres `time`, both or neither), like the task's calendar dates. No
  time = any time on the day / in the range. Replaces the unused
  `starts_at`/`ends_at`.
- Members see the display names of everyone holding a shift on the same
  task: they meet at the shift anyway.
- One shift per member per task. Double shifts can come later if needed.
- A window ending after midnight sets `ends_next_day`; core derives it
  (end ≤ start), a check keeps it consistent. `position` keeps the form
  order for shifts with the same start.
- One shift per member per task is a partial unique index
  (`shift_one_per_member_idx`); drop it to allow double shifts.
- Editing shifts: open ones change freely; taken/reported keep their
  window and can't be removed (hours may change); confirmed are locked.
  Shifts are matched by id, read FOR UPDATE.
- "Together" = two shifts overlap; a shift without a window overlaps
  everything (as in the prototype). "Doable now" = a free shift and the
  task is on today (Europe/Berlin, `localToday`).

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

**Decided:**

- Occurrences are materialised: real `task` + `shift` rows with
  `series_id`, generated up to `lookahead` ahead. The rule lives in
  `task_series`, not in a genesis task. Shifts, the ledger and the
  queue never know about series.
- Rule changes, pause and end only touch future occurrences that were
  generated, have no assignee and weren't edited individually.
- No worker yet: the generator runs on series save, after confirming a
  series occurrence (same transaction), and as a daily top-up on the
  first task-list load. A nightly job waits for the worker process.

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

Things the prototype implies that we should _not_ settle yet. Revisit
when the design side stabilises.

- **Past tasks.** A task whose date has passed can still be taken and
  reported. Slice 3 gave "done" a meaning but not "overdue"; decide with
  series (slice 5), where completion-relative repeats need it anyway.
- **Registration.** Self-serve with a rules checkbox, per the prototype.
  Whether admins approve is unresolved.
- **Tenant grace.** Guidance or enforcement? Their copy says a minus is
  normal and not an error.
- **Wiki permissions.** Built-in pages visible to all members, editable
  by admins? Or editable by everyone, with revisions as the safety net?
- **Completion criteria.** A checklist ticked when reporting a task or
  returning a resource. Same concept for both; model it when the first
  of them needs it.
- **Send-back history.** Only the latest reason is kept; reporting again
  clears it. If admins want to see how often something went back and
  forth, add a `shift_event` log.

---

## Cross-cutting, not slices

Handled inside whichever slice first needs them:

- PWA shell, offline behaviour, install prompt
- Notification delivery (email first; preference fields exist from
  slice 1)
- Seed data mirroring the prototype, kept working as a demo fixture
