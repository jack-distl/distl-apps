# Rebuilding the Distl Platform on WordPress

*Planning document — nothing here is built yet. Written September 2026.*

The platform is moving to a new GitHub repository wired to a WordPress build.
This maps out what that actually takes: what we keep, what we rewrite, what
breaks, and roughly how long it runs.

---

## The short version

**We keep the React app. We replace Supabase.**

The app is ~14,200 lines of React. Only about 74 lines of it talk to Supabase,
and all of those are plain create/read/update/delete — no stored procedures, no
realtime subscriptions, no file storage, no database joins. That is the whole
coupling. The other ~99% of the code neither knows nor cares what is behind it.

So the job is not "rebuild the app in WordPress". It is "give the app a
WordPress-shaped back end and a WordPress-shaped front door". That is a port,
not a rewrite, and it is the difference between roughly three weeks and roughly
three months.

| | |
|---|---|
| **Runs as** | A WordPress plugin that adds a page inside `wp-admin` |
| **Data lives in** | Custom MySQL tables (`wp_distl_*`), not posts or post meta |
| **Login is** | The normal WordPress login, with WordPress roles |
| **Deploys by** | Pushing to the new repo; CI builds the JavaScript bundle |
| **Rough effort** | 15–21 focused working days |

---

## 1. What exists today

Measured from the repository, not from memory.

### Code

| Area | Lines | Fate |
|---|---:|---|
| Sitemap logic (`src/lib/sitemap/`) | 2,268 | **Unchanged** — pure JavaScript, no back end |
| Feature pages (`src/features/`) | 7,379 | **Unchanged** except routing |
| Shared components (`src/components/`) | 1,979 | Mostly unchanged; auth screens deleted |
| Other shared libs (`src/lib/*.js`) | 642 | Mostly unchanged; `supabase.js` replaced |
| Data hooks (`src/hooks/`) | 1,561 | **Rewritten against the new API** |
| Serverless functions (`api/`) | 455 | **Rewritten in PHP** |
| Database migrations (`supabase/`) | ~20 files | **Ported to MySQL** |

The single biggest file is `src/features/okr/OkrPlanner.jsx` at 2,086 lines. It
touches no database directly — it consumes `useOkrData`. That is the pattern
throughout, and it is why this is tractable.

### Data

Nineteen live tables (three earlier sitemap placeholders and three WorkflowMax
tables were already dropped by migrations 015 and 016):

**Core** — `clients`, `team_members`, `client_retainers`

**OKR Planner** — `okr_periods`, `okr_objectives`, `okr_key_results`,
`okr_objective_pages`, `task_library`, `objective_templates`,
`objective_template_tasks`

**Sitemap Tool** — `sitemaps`, `sitemap_page_templates`, `sitemap_pages`,
`sitemap_keywords`, `sitemap_versions`, `sitemap_version_uploads`,
`sitemap_version_page_metrics`, `sitemap_version_keyword_positions`,
`sitemap_version_queries`

`team_members` is referenced by row-level security policies but never read by
any application code. It should not survive the move — WordPress users replace
it (see §5).

### External services

- **Supabase** — database and auth. Being replaced.
- **Monday.com** — `api/monday/*`, pushes OKR tasks as subitems. Must keep working.
- **Remote sitemap.xml fetching** — `api/sitemap/fetch.js`, reads a client's
  live sitemap server-side. Must keep working.
- **Vercel** — hosting and preview deploys. Being replaced by the WordPress host.

---

## 2. The architecture, and why

### Decision: a React SPA inside `wp-admin`, on custom MySQL tables

A WordPress plugin registers an admin menu item. Opening it loads a single
container div and the compiled React bundle. The app runs exactly as it does
now, but every request goes to `/wp-json/distl/v1/…` instead of Supabase, and
the user is already authenticated because they logged into WordPress.

**Why this and not the alternatives:**

*Rebuilding the UI in PHP* would mean re-engineering the sitemap board — the
column layout, the hover arrows that move pages left/right and up/down, the
"show under" grouping, the debounced autosave, the live tree derivation from
URL paths. That is the most valuable and most intricate part of the product,
and PHP page-reloads are the wrong shape for it. This option is a genuine
rewrite and is not recommended.

*Headless — WordPress as database only, app stays on Vercel* keeps two deploy
targets and two sets of credentials, which appears to be the thing the move is
trying to get rid of.

*A front-end page on the public site* is viable, but the tools are internal-only
and `wp-admin` already gives us login, roles, password resets and a nonce
system for free. A dedicated tools install (which is the plan) has no public
site worth presenting anyway.

**Why custom tables and not custom post types:** `sitemap_version_queries`
holds every Search Console query attributed to every page, for every review
period, for every client. The importer already batches those inserts 500 rows at
a time. As post meta that becomes tens of thousands of rows in `wp_postmeta`
per client and the roll-up queries stop being viable. Custom tables also keep
the foreign keys and uniqueness constraints that currently stop the data going
crooked. Clients could reasonably be a custom post type, but splitting the model
across two storage styles buys a WordPress admin screen we do not need and costs
clarity everywhere else.

### What the stack looks like after

| Layer | Now | After |
|---|---|---|
| Framework | React 18 + Vite | **Unchanged** |
| Styling | Tailwind | Tailwind, scoped to the app container |
| Routing | React Router (BrowserRouter) | React Router (**HashRouter**) |
| Database | Supabase Postgres | MySQL via `$wpdb` |
| Auth | Supabase Auth | WordPress users + roles |
| API | Supabase JS client | WordPress REST API |
| Server functions | Vercel functions (Node) | WordPress REST routes (PHP) |
| Hosting | Vercel | Managed WordPress host |

---

## 3. Porting the database

The schema translates cleanly, but there are six specific places Postgres and
MySQL disagree. Each one has a decided answer.

### 3.1 The easy substitutions

| Postgres | MySQL | Note |
|---|---|---|
| `uuid` | `CHAR(36)` | The app already generates IDs client-side with `crypto.randomUUID()`, so no server default is needed |
| `timestamptz` | `DATETIME` | Store UTC. Avoid `TIMESTAMP` — it carries a 2038 limit and surprising timezone conversion |
| `numeric(5,1)` | `DECIMAL(5,1)` | Direct |
| `text` (indexed) | `VARCHAR(n)` | MySQL cannot index `TEXT` without a prefix length — see 3.5 |
| `text` (not indexed) | `TEXT` / `LONGTEXT` | Direct |

### 3.2 Arrays and JSON → `JSON` columns

Four columns are non-scalar: `sitemaps.menus` and `sitemap_pages.menu_names`
(Postgres `text[]`), and `sitemap_page_templates.blocks` and
`sitemap_version_uploads.unmatched` (`jsonb`).

All four are read and written whole and never queried by element — confirmed
against every call site. MySQL `JSON` columns are a direct swap with no
behaviour change. The CSV import does need to convert Postgres array literals
(`{Primary Navigation,Footer Navigation}`) into JSON arrays.

### 3.3 The partial unique index — the one real gap

Migration 015 enforces "exactly one primary keyword per page" with:

```sql
create unique index idx_sitemap_keywords_one_primary
  on sitemap_keywords(page_id) where is_primary;
```

**MySQL has no partial indexes.** But a stored generated column reproduces it
exactly, because unique indexes ignore `NULL`s:

```sql
primary_page_id CHAR(36) GENERATED ALWAYS AS (IF(is_primary, page_id, NULL)) STORED,
UNIQUE KEY uniq_one_primary (primary_page_id)
```

Rows where `is_primary` is false generate `NULL` and are not compared; rows
where it is true collide on `page_id` exactly as before. The application already
clears the old primary before setting a new one (`useSitemapData.js:269`), so
behaviour is preserved either way — this keeps the database as the backstop.

### 3.4 `CHECK` constraints

MySQL enforces `CHECK` from 8.0.16; MariaDB from 10.2. Below those versions
they parse and are **silently ignored**, which is worse than failing. The
plugin should assert the database version on activation and refuse to install
below the threshold rather than quietly losing every status and role constraint.

### 3.5 Index key lengths

`sitemap_pages` has `unique (sitemap_id, url)`. With `url` as `TEXT` that is
not indexable. Make it `VARCHAR(500)`; under `utf8mb4` that is 2,000 bytes,
comfortably inside InnoDB's 3,072-byte limit with `DYNAMIC` row format. Same
treatment for every other indexed text column.

### 3.6 `dbDelta` cannot handle foreign keys

WordPress's schema helper chokes on `FOREIGN KEY` clauses. The pattern is:
create tables with `dbDelta` (columns and plain indexes only), then add the
foreign keys in separate `ALTER TABLE` statements.

Keep the real foreign keys. Every `ON DELETE CASCADE` in the current schema is
load-bearing — deleting a client should take its sitemap, pages, keywords,
versions and every performance row with it. Reimplementing that in PHP is how
orphan rows appear.

### 3.7 `updated_at` triggers

No trigger needed. `DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE
CURRENT_TIMESTAMP` does the job natively.

### 3.8 Row-level security has no equivalent

There is no MySQL analogue of RLS, so **all access control moves into the API
layer**. This is less of a downgrade than it sounds: every current policy is
effectively "any authenticated team member may do anything", so it collapses
into one capability check per endpoint. But it does mean a missing check is now
an open door where previously the database would have refused. Every route gets
a `permission_callback`. No exceptions, and it is worth a checklist review
before launch.

---

## 4. The API layer

### 4.1 Recommended: a thin compatibility shim

The Supabase client is used through a small, fixed vocabulary. Counted across
the codebase, the app uses exactly: `select`, `insert`, `update`, `delete`,
`upsert`, `eq`, `in`, `order`, `range`, `single`, `maybeSingle`. That is all —
no `rpc`, no `channel`, no `storage`, no nested selects.

That is small enough to reimplement. A ~200-line module at `src/lib/api.js`
exposing the same chainable shape, backed by `fetch()` against a generic
WordPress REST CRUD route, means **the 74 call sites change by one import
line**. The 2,086-line OKR planner and the 525-line sitemap hook keep working
without being touched, which is where the regression risk lives.

```js
// Before
import { supabase } from '../lib/supabase'
await supabase.from('sitemap_pages').update(fields).eq('id', id)

// After
import { api as supabase } from '../lib/api'
await supabase.from('sitemap_pages').update(fields).eq('id', id)
```

**The obvious objection:** a generic "any table, any filter" endpoint is SQL
over HTTP. Three things contain it — a hardcoded allowlist of the 18 tables and
their columns, a capability check on every request, and the fact that every
authenticated user already has full read/write on all of it. The blast radius
equals the existing permission model; it does not widen it. Anything outside
the allowlist is a 400.

Purpose-built endpoints for the two hot paths (`useHubStats`, which pages
through every client's data, and `loadSitemap`, which fires nine queries) are
worth adding later as an optimisation. They are not worth blocking the port on.

### 4.2 Batch writes and pagination

Two existing behaviours need deliberate handling:

- **Supabase's 1,000-row cap.** `useHubStats.js` pages around it explicitly. The
  WordPress endpoint should keep a comparable cap and the same paging contract,
  or the hub numbers will quietly understate once real client data lands — the
  exact bug the current comment warns about.
- **500-row insert batches.** The version importer chunks query inserts at 500.
  Those must become a single multi-row `INSERT` per batch in PHP, not 500
  separate `$wpdb->insert()` calls, or importing a review will time out.

### 4.3 Nonces will bite

This is a tool people leave open all day with debounced autosave. WordPress REST
nonces expire after 12–24 hours, and an expired nonce returns 403. The autosave
path must detect that, refresh the nonce (via a lightweight endpoint or WP's
heartbeat API) and retry — otherwise someone's afternoon of sitemap edits fails
silently at 5pm. The existing save-status machinery (`idle | unsaved | saving |
saved | error`) already gives us somewhere to surface it.

---

## 5. Authentication

Supabase Auth goes away entirely and WordPress takes over.

| Currently | Becomes |
|---|---|
| `LoginPage.jsx` (203 lines) | The WordPress login screen |
| `AuthCallback.jsx` (79 lines) | Not needed |
| `SetPassword.jsx` (111 lines) | WordPress's own set-password email |
| `useAuth.js` invite/reset flow | WordPress user management |
| `team_members` table | WordPress users |
| Roles `admin` / `am` / `seo` | Three custom WordPress roles |

Roughly 400 lines of React get deleted and replaced by functionality WordPress
already ships. Inside `wp-admin` the user is authenticated before the bundle
even loads, so the app's auth-gating in `App.jsx` reduces to reading the current
user from a bootstrapped global.

The three roles map to custom WordPress roles carrying a `distl_use_platform`
capability, plus `distl_manage_clients` for admins — mirroring the intent of the
admin-only client-management policy in migration 001.

---

## 6. The two integrations

Both must keep working, and both are straightforward PHP ports.

### Monday.com push (`api/monday/*`, 355 lines)

A single GraphQL endpoint, a long-lived token, no OAuth. Becomes three REST
routes under `distl/v1/monday/`. `fetch` → `wp_remote_post`. The retry-on-429
logic and the "Monday returns HTTP 200 even for GraphQL errors, always check
`json.errors`" trap port directly.

The token belongs in a `wp-config.php` constant — not the options table, not the
repository. Note the board IDs are currently hardcoded (`SEO_BOARD_ID`,
`ACTIVE_CLIENTS_GROUP_ID`); the move is a reasonable moment to promote them to
settings, but it is optional.

### Remote sitemap.xml fetch (`api/sitemap/fetch.js`, 100 lines)

This one gets *better* in WordPress. The JavaScript hand-rolls a guard against
fetching private IP ranges (localhost, `10.`, `192.168.`, `169.254.`,
`172.16–31.`) to prevent server-side request forgery. `wp_safe_remote_get()`
does exactly that validation as standard, so the guard becomes a built-in.

`parseSitemapXml` (38 lines, `fast-xml-parser`) becomes SimpleXML.

**The real risk is PHP execution time.** The current crawler will follow up to
60 sitemaps at 12 seconds each — far beyond a typical `max_execution_time` of
30–60 seconds on managed hosts. Options: lower the caps, run the crawl in
chunks across multiple requests, or push it to a background job. This needs
deciding before it is built, not after it times out on a large client site.

---

## 7. Front-end changes

Four concrete changes, all in the app shell. No feature code moves.

**Routing.** Inside `wp-admin` the page lives at
`/wp-admin/admin.php?page=distl-platform`. `BrowserRouter` cannot work there.
Switch to `HashRouter`, giving URLs like
`…?page=distl-platform#/sitemap/:clientId`. Deep links and the sidebar keep
working; the URLs get uglier. This is a one-line change in `main.jsx` plus a
check that nothing constructs paths by hand.

**Tailwind isolation.** This is the fiddliest task and the one most likely to
overrun. `wp-admin` ships its own global CSS, and Tailwind's preflight reset
will fight it in both directions. The approach: set `important: '#distl-root'`
in `tailwind.config.js`, disable preflight, and ship a scoped reset applying
only inside the container. Budget real time for visual QA — the sitemap board
and the detail panel are the places to look hardest.

**Asset loading.** Vite needs `base` pointed at the plugin's assets URL, and
either fixed output filenames or a manifest the PHP reads to enqueue the
hashed files. Prefer the manifest — cache-busting matters on a tool people keep
open.

**Security headers.** The CSP in `vercel.json` moves to PHP or host config, and
gets simpler: `connect-src https://*.supabase.co` disappears because everything
is same-origin now.

---

## 8. Moving the data

UUIDs are the thing that makes this painless. Because every primary key is a
UUID generated client-side, **we import rows as-is and every foreign key still
points where it should**. There is no ID remapping step, which is where this
kind of migration normally goes wrong.

1. Export all 19 tables from Supabase as CSV (dashboard, or
   `pg_dump --data-only --column-inserts`).
2. Write a one-shot WP-CLI command in the plugin —
   `wp distl import --dir=./export` — that reads the CSVs and inserts them.
3. Import in dependency order: `clients` → `client_retainers`; `sitemaps` →
   `sitemap_page_templates` → `sitemap_pages` → `sitemap_keywords` →
   `sitemap_versions` → the four `sitemap_version_*` tables; `okr_periods` →
   `okr_objectives` → `okr_key_results`; `task_library` →
   `objective_templates` → `objective_template_tasks` →
   `okr_objective_pages`.
4. Transform the four array/JSON columns (§3.2) on the way in.
5. Verify: row counts per table, then a real check — run `pnpm test:sitemap`
   and export a client's WordPress CSV from the new install and diff it against
   one exported from the old one. They should be byte-identical.

That last step matters. The repository already has a parity test proving the
WordPress export matches a reference file exactly. It is pure JavaScript, so it
survives the move untouched and becomes the single best regression anchor we
have. Keep it green at every stage.

Do at least two full dry runs into a throwaway database before the real one.

---

## 9. Sequence and effort

Indicative, assuming focused work and no surprises from the host.

| # | Phase | Days | Gate |
|---|---|---:|---|
| 0 | Confirm host, PHP/MySQL versions, deploy mechanism; spike Tailwind in `wp-admin` | 1 | MySQL ≥ 8.0.16, custom tables allowed, CSS is containable |
| 1 | Plugin scaffold, MySQL schema, activation/upgrade routine | 3–4 | All 19 tables create cleanly with FKs |
| 2 | REST CRUD routes + `src/lib/api.js` shim; app boots against WordPress | 3–4 | Every screen loads real data |
| 3 | Auth: roles, capabilities, delete the Supabase auth screens | 1–2 | Login works, non-team users get nothing |
| 4 | Monday push + sitemap fetch in PHP | 2–3 | A real push lands on the board; a real sitemap.xml parses |
| 5 | UI embedding: HashRouter, Tailwind scoping, admin menu, asset pipeline | 2–3 | Visual QA passes on board, detail panel, planner |
| 6 | Data migration CLI, two dry runs, parity check | 2 | Export diff is byte-identical |
| 7 | Deploy pipeline on the new repo | 1–2 | A push deploys |
| | **Total** | **15–21** | |

Phases 1 and 2 are the critical path. Phase 5 is the one most likely to run
over, because CSS conflicts are discovered rather than estimated.

---

## 10. Risks, honestly

| Risk | Severity | Handling |
|---|---|---|
| Tailwind vs `wp-admin` CSS | **High** — unpredictable, discovered not estimated | Spike it in phase 0 before committing to the approach |
| Sitemap crawl exceeds PHP `max_execution_time` | **High** — fails on exactly the large client sites we need it for | Decide chunked-or-background before building; lower caps as a stopgap |
| Nonce expiry silently killing autosave | **Medium** — will happen, on a tool left open all day | Refresh-and-retry in the save path, surfaced through the existing error state |
| No RLS backstop | **Medium** | `permission_callback` on every route; explicit pre-launch checklist |
| MySQL < 8.0.16 ignoring `CHECK` silently | **Medium** | Assert the version on activation and refuse to install |
| Managed host git-deploy semantics vary | **Medium** | Confirm in phase 0; CI-builds-then-deploys is the portable fallback |
| Losing preview deploys | **Low** | Most WP hosts have staging; not a blocker |

---

## 11. Open questions

1. **Which host?** It decides the deploy mechanism, PHP limits and whether
   staging exists. Everything in phase 0 waits on this.
2. **Commit the built bundle, or build in CI?** Committing works everywhere and
   makes ugly diffs. CI is cleaner and depends on what the host accepts.
3. **Does anything else need the data?** The current tables are reachable with a
   Supabase key. After the move they are behind WordPress auth. If any script,
   report or Claude skill reads them today, it needs a new route in.
4. **Keep the mock-data fallback?** Every hook currently falls back to mock data
   when Supabase is unconfigured, which is what makes `pnpm dev` work with no
   credentials. Worth keeping for local development, but it needs a new trigger.
5. **Does the old Supabase project stay up?** Recommended: keep it read-only for
   a month after cutover as a safety net, then delete it.

---

## 12. What we are not doing

Worth stating, so it does not get quietly added:

- Not rebuilding any feature. Behaviour parity is the goal; the migration is not
  the moment to change how the OKR planner or sitemap board work.
- Not touching `src/lib/sitemap/` (2,268 lines). It is pure logic and it stays.
- Not moving the public distl.com.au website. This is the internal tools install
  only.
- Not modelling clients as posts, pages or any other WordPress content type.
