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

Status: **done.** Admins create and edit tasks with several shifts (time
window or none, past midnight, own hours); held shifts keep their window.
Members see free/total, who else is on a task and parallel slots, pick a
shift when taking, and filter by urgent / doable today / together. Tested
in core (shifts.test.ts, service.test.ts) and end to end (shifts.e2e.ts).

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
- Admin form: shift rows live in the remote form's own state
  (`fields.shifts.value()/set()`), so failed submits come back with the
  posted rows. Adding/removing rows needs JS; without JS the form edits
  the rows it has.
- `toFormIssues` turns numeric path segments into numbers
  (`shifts.0.hours` → `['shifts', 0, 'hours']`); SvelteKit only matches
  array fields that way.
- Member detail: one take form; with several free shifts the member picks
  one by radio inside it (works without JS, one confirmation).
- List filters `urgent`, `now`, `together` are URL toggles (`?now=1`),
  evaluated in core; "doable now" uses Europe/Berlin's today.
- Cards show the hours range on offer ("1,5–4 Std.") or the member's own
  shift's hours once they hold one.

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

Status: **done.** Admins create series at `/admin/series` (weekly,
biweekly, monthly by weekday/day/window, every N days after the last
completion, manual dates), with a live preview of the next dates; pause,
resume, end, delete and add dates by hand. Occurrences are ordinary tasks
for members, marked "Serie" for admins with a link back. Tested in core
(rule.test.ts, series/service.test.ts) and end to end (series.e2e.ts).

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
- The rule is one jsonb column (`task_series.rule`), a tagged union
  validated in core; its shape decides date vs. range, so the series has
  no `when_kind`. Weekdays 0 = Monday.
- Periods have stable keys (`w:<Monday>`, `m:<YYYY-MM>`, `d:<start>`);
  `(series_id, period_key)` is unique, so generating is idempotent.
  Occurrences added by hand have no key.
- Monthly "nth 5" = last weekday of the month; day 31 = last day.
  Ranges that have begun start today; until cuts ranges short.
- `lastDone` = local day the latest confirmed shift was _reported_
  (when the work happened, not when it was confirmed).
- "Every N days" keeps one occurrence ahead, regardless of `lookahead`;
  each confirmation generates the next in the same transaction.
- Pending = live, not over, and some shift not yet confirmed. Lookahead
  counts pending occurrences, generated or not.
- Replan (series edit, resume, end, and a confirmation for "every N
  days" or a minimum gap): untouched occurrences (generated, never taken,
  not edited, not over) are hard-deleted and regenerated. A soft-deleted
  occurrence keeps its period key, so it never comes back.
- Pause and delete withdraw untouched occurrences; taken ones stay.
  Editing an occurrence through the task form sets `series_edited`.
- Daily top-up: `topUpSeriesDaily(db)` from task-list loads, once per
  day and process. Code lives in `core/src/tasks/series/`.
- The series form shares title ... details and the shift rows with the
  task form (`admin/tasks/TemplateFields.svelte`); its rule inputs are
  all posted, shown per mode once JS runs, read per mode by core.
- The preview is a remote query (`previewSeries`); core stays
  server-only.
- `topUpSeriesDaily` runs from the member list, "Meine Aufgaben", the
  admin task list and the series list; failures are logged, not shown.

---

## Slice 6a — Messaging

Member inbox, admin inbox with claiming, direct and group messages,
task chats, block list and `dm_open`.

Status: **done.**

**Decided:**

- Four thread kinds: `admin` (a member writes to all admins), `direct`,
  `group` (several recipients), `task` (everyone currently holding a
  shift on the task). One table `thread`, kind as a text code.
- Access is derived in core, not stored: admin threads = the member +
  every admin; task threads = current shift holders (taking/releasing
  changes access, nothing to sync); direct/group = participant rows.
- `thread_participant (thread_id, user_id, last_read_at, hidden_at)`:
  read state is one timestamp per person, not per message. Admins get a
  row lazily when they first open an admin thread.
- All admins see all admin threads. The inbox filters by category via
  the referenced task; default = the admin's capabilities (all for
  superadmins / admins without capabilities), threads without a task
  always shown. Tabs: Offen, Niemand, Meine, Archiv.
- Replying to an unclaimed admin thread claims it; claims can be taken
  over. Archive and claim are per thread (shared by all admins). Delete
  for admins is a soft delete (`admin_deleted_at`); the member keeps
  their copy.
- Message bodies are TipTap JSON, profile `message` (bold, italic,
  strike, inline code, code block, links, lists; no headings, no
  images), max 4000 characters of plain text. Enter sends, Shift+Enter
  is a new line (touch: button sends).
- Authors can retract a message at any time (`retracted_at`, body
  cleared, shown as "zurückgenommen").
- "Remove from my inbox" sets `hidden_at`; a newer message brings the
  thread back.
- Anyone may write to anyone (like Mattermost); members can opt out
  (`profile.dm_open = false`), then only admins and task chats reach
  them. Blocks (`user_block`) stop direct/group messages from the
  blocked person; admins are never blocked. Profiles with
  `visibility = admins` appear in the recipient picker for admins only.
- System messages (`message.system`, no author): send-back reasons and
  confirmation thanks go into one admin thread per member and task,
  which becomes the visible history of that task's back and forth.
  `confirmation.ts` calls messaging inside its transaction.
- No real time and no email in this slice: inboxes refresh on
  navigation and after sending. Email waits for notification delivery.
- Later: "An Awareness melden" (report a thread to the admins with an
  excerpt; `thread.reported_thread_id`).
- Core lives in `core/src/messaging/` (schema, policy, service). Access
  is checked by `threadAccess`; anything not readable is
  `thread_not_found`. Unread = messages after the participant's
  `last_read_at`, not by the reader, not retracted.
- One direct thread per pair (`direct_key`, unique), one chat per task
  (partial unique index). Task chats without messages stay out of the
  inbox. People who released their shift lose access to the chat.
- In group threads a blocked person can still reply; blocking stops new
  conversations and direct replies.
- Member UI: `/messages` (inbox), `/messages/new` (recipient picker,
  filters in the browser; one person → direct, several → group),
  `/messages/admins` (`?task=` attaches a task), `/messages/[id]`.
  "Postfach" in the member and admin nav with an unread badge, loaded
  after every navigation into plain state; never awaited in the root
  layout, since that would hold up every page below it (form redirects
  hung in e2e). The task page has "Chat zur Aufgabe" (shift holders)
  and "Frage an die Admins" (everyone).
- Opening a conversation marks it read (the thread query calls core's
  `openThread`). Only the thread page calls it.
- Reachability lives on `/profile`: `dm_open` and the block list with
  "Aufheben". Blocking happens from a direct conversation, with a
  confirmation; the blocked person isn't told.
- Admin inbox `/admin/messages`: tabs with counts, search (subject,
  member), order (newest / waiting longest), "Meine Bereiche" / "Alle
  Bereiche" (default: own categories; the toggle only shows for admins
  with capabilities). Bulk archive / bring back / delete for admins
  (one form, the pressed button decides). The conversation view is
  shared with members (`Conversation.svelte`) plus a claim/archive bar.
  The admin nav badge counts open threads in the own categories with
  something unread.
- Send-back reasons and confirmations post system messages
  (`messaging/internal.ts`, inside the confirmation transaction) to one
  admin thread per member and task (`task_log`). Members see it right
  away; the admin inbox shows it only once the member writes there.
  System messages never count as unread for admins. A new system
  message brings the thread back (top, out of the archive, undeleted).

## Slice 6b — Built-in wiki

Status: **done.**

**Decided:**

- Saves carry the base revision; a stale base fails with
  `wiki_page_conflict`.
- `KnowledgeProvider` port in core with the built-in implementation;
  `knowledge_link (entity_type, entity_id, provider, ref,
cached_title)` is provider-neutral. Tasks and series templates get a
  link picker; occurrences copy the series' links.
- Markdown export per page.
- Everyone reads; admins create, edit, move, delete, restore. Every
  save is an immutable `wiki_revision`; unchanged saves create none;
  restoring = a new revision. Saves carry `baseRevisionId`; a stale
  base fails with `wiki_page_conflict`.
- Max 3 levels, also when moving a subtree; not into itself. Only pages
  without subpages can be deleted (soft). A restored page whose parent
  is gone returns at top level.
- Slugs from the title (umlauts spelled out, `-2` … on clashes), kept
  on rename. Links store the page id as `ref`.
- Search: generated `tsvector` (title A, text B, German config) + GIN;
  query = web-search syntax OR every word as prefix, because German
  compounds ("Schlüsselbund") don't stem to "schlüssel".
- `richtext`: profile `wiki` (h2/h3, quotes, code, strike, rules,
  lists, links; no images until uploads exist) and `toMarkdown`
  (own serializer, no dependency).
- Later (Outline adapter): the port returns sanitised HTML, so external
  entries render in the app. Outline's Markdown → HTML on our server;
  attachments go through an authenticated proxy route of ours (Outline
  URLs need its login); one API token, limited to one collection; short
  cache; editing stays in Outline (`editUrl`).
- UI: `/wiki` (search via ?q, page tree), `/wiki/[slug]` (breadcrumbs,
  subpages; admins: edit, subpage, Markdown, delete), `/wiki/new`
  (?parent), `/wiki/[slug]/edit` (+ move), `/wiki/[slug]/history`
  (?rev, restore), `/wiki/trash`, `/wiki/[slug]/markdown` (download).
  "Wiki" in the member nav (area colour `qual`).
- On a save conflict the text stays in the editor, the new version
  opens in a new tab; the edit form keeps its starting revision even
  when queries refresh.
- Links (step 3): task and series forms get an "Im Wiki" picker (search,
  up to 10 pages, posted as `links[i]` = `builtin:<page id>`). Members see
  them under the description as "Gut zu wissen": title + ~160 characters.
- Occurrences copy the series' links when created; a series edit replaces
  untouched occurrences, so they get the new links, taken/edited ones keep
  theirs. Duplicating a task copies its links.
- A deleted wiki page stays linked with its cached title and shows
  "nicht mehr verfügbar"; saving the task keeps it. Unknown pages are
  refused (`knowledge_link_not_found`).
- Links go with a task only when it is hard-deleted (withdrawn
  occurrences); soft-deleted tasks keep them for restore.

## Slice 6c — Uploads, task images, profile pictures

The prototype shows photos on tasks, suggestions and profiles. Nothing
can be uploaded yet, so this slice builds that once and uses it twice.

- `FileStorage` port with a local-disk adapter (see ARCHITECTURE)
- Uploads are generic: `upload` (kind `image | document | audio |
  video`, detected mime type, original name, size, meta) and
  `upload_file` (one row per stored variant). Each kind gets a
  processor; only the image processor exists in this slice, every
  other type is rejected. The type is detected from the file's bytes.
- Images are re-encoded on the server: resized (large + thumbnail),
  WebP, metadata stripped (no GPS from phone photos). Originals are
  never stored. JPEG/PNG/WebP, up to 10 MB.
- Served by `/media/[id]/[variant]` behind the login; core decides who
  may see which upload
- **Task image**: one per task, optional alt text; shown on cards and
  the detail page. Series templates carry one too; occurrences and
  duplicates share it rather than copying.
- **Profile picture**: upload, replace, remove; shown wherever an
  avatar appears, following the photo visibility setting. Removed
  pictures are deleted immediately.

Deliberately not here: images inside rich text (wiki, descriptions),
suggestion photos (slice 7 uses the same foundation), the S3 adapter,
orphan cleanup (needs the worker).

Status: **in progress.**

- **Step 1 — foundation: done.** `packages/media` (storage port, disk
  and memory adapters, type detection, image processor), `upload` and
  `upload_file` tables, `core/uploads` (store, open, access check,
  delete), `/media/[id]/[variant]`, adapter-node, upload demo on
  `/dev/ui`. Until step 2, only superadmins and the uploader can see an
  upload.
- **Step 2 — task images: next.** Task and series forms, cards,
  detail page.
- **Step 3 — profile pictures.** Upload/replace/remove, avatars
  everywhere, photo visibility enforced at `/media`.

Demo: an admin adds a photo to a task, members see it in the list;
Kim sets a profile picture visible to admins only, Lu sees initials.

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

- **Registration.** Self-serve with a rules checkbox, per the prototype.
  Whether admins approve is unresolved.
- **Tenant grace.** Guidance or enforcement? Their copy says a minus is
  normal and not an error.
- **Completion criteria.** A checklist ticked when reporting a task or
  returning a resource. Same concept for both; model it when the first
  of them needs it.
- **Send-back history.** Only the latest reason is kept; reporting again
  clears it. If admins want to see how often something went back and
  forth, add a `shift_event` log.
- **Profile picture from the IdP.** OIDC has a `picture` claim
  (Better Auth stores it in `user.image`); our Keycloak doesn't hold
  pictures. If a space's IdP does: import once on first login through
  the upload pipeline, fetching only from the IdP's origin.
- **Orphaned uploads.** Replaced task images stay on disk until a
  cleanup job removes files no task, series or profile references.
  Belongs to the worker process.
- **Other file types.** PDFs (stored as uploaded, served sandboxed or
  as download; later a page-1 preview), audio and video (Range
  requests for playback; transcoding and posters need the worker and
  ffmpeg). Large files need a different upload path: presigned direct
  upload with S3, resumable uploads (tus) with local disk. Several files
  on one entity need an `attachment` table. Some documents may belong
  in the wiki instead; decide with the first real case.

---

## Cross-cutting, not slices

Handled inside whichever slice first needs them:

- PWA shell, offline behaviour, install prompt
- Notification delivery (email first; preference fields exist from
  slice 1)
- Seed data mirroring the prototype, kept working as a demo fixture