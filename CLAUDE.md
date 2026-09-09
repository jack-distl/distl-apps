# Distl Platform

Internal tools platform for Distl — a full-service digital marketing agency in Perth, Western Australia.

**Tagline:** Brand Purity. Digital Potency.

---

## Git Workflow (IMPORTANT — read this first)

This project uses a simple two-branch system:

- **`main`** = Production. This is what's live on the real website. Never push directly to main.
- **`testing`** = Staging. All new work goes here first. This has its own preview URL on Vercel.

### Rules for Claude Code sessions

1. **Default branch is `testing`.** Unless Jack specifically says "push to main" or "merge to main", all work happens on `testing` or on a feature branch that merges into `testing`.
2. **Never push directly to `main`.** Changes reach `main` only through a Pull Request from `testing` → `main`.
3. **Commit often with clear messages.** Every meaningful change should be a separate commit so it's easy to undo individual things.
4. **If something breaks, say so.** Don't try to hide errors — explain what went wrong and how to fix it.

### How Vercel deploys work

- When code is pushed to `main` → Vercel auto-deploys to the **production** URL
- When code is pushed to `testing` → Vercel auto-deploys to a **preview** URL
- Every Pull Request also gets its own temporary preview URL

This means Jack can always check the testing preview before anything goes live.

---

## About Distl

- **Location:** 3/73 Troy Terrace, Jolimont WA 6014
- **Phone:** 08 9381 4441
- **Email:** hello@distl.com.au
- **Website:** https://distl.com.au
- **Heritage:** 30+ years in marketing and brand building

### Services

- **Branding:** Brand strategy, brand identity, logo design, graphic design
- **Web:** WordPress, eCommerce, Shopify, UX, hosting
- **Marketing:** SEO, Google Ads, Social Media, Programmatic, GEO, Spotify Ads, Email

### Mission

Building Australia's most unstoppable brands through the framework: **Differentiate → Engage → Amplify → Grow**

### Values

1. **Start with empathy** — Listen harder. Find the insight that unlocks value.
2. **Play the long game** — Quick wins are good, but we focus on the big picture.
3. **Be an open book** — Warts and wins, there's nothing to hide.
4. **Less, but better** — Keep it simple but not stupid.
5. **Push the boundaries** — Go further, go deeper. Explore what's possible.
6. **Continuously improve** — There's always a better way. We work hard to find it.

---

## Brand & Styling

### Colours

| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Coral | `#E8806A` | `coral` | Primary brand colour, logo, CTAs |
| Coral Dark | `#D66B55` | `coral-dark` | Hover states |
| Coral Light | `#F2A090` | `coral-light` | Light accents |
| Charcoal | `#1A1A1A` | `charcoal` | Headers, dark backgrounds |
| Off-Black | `#111111` | — | Footer, deep backgrounds |
| Cream | `#FAF9F7` | `cream` | Light backgrounds, cards |
| White | `#FFFFFF` | `white` | Content areas |
| Text Dark | `#333333` | `gray-800` | Body text |
| Text Light | `#666666` | `gray-500` | Secondary text |

### Typography

- **Headings:** Clean sans-serif (Inter), often italicised for emphasis
- **Body:** System sans-serif stack
- **Style:** Minimal, elegant, generous whitespace

### Design Principles

- Clean and uncluttered
- Generous whitespace
- High-quality imagery (real photos, not stock)
- Subtle animations and hover effects
- Cards with soft shadows
- Rounded corners (subtle, not bubbly)

### Tone of Voice

- Confident but not arrogant
- Warm and approachable
- Slightly playful (e.g., "Having a geez", "Before you pick us, pick our brains")
- Direct and jargon-free
- Australian vernacular welcome

---

## Project Structure (actual, current)

This is a **single React app** (not a monorepo). Everything lives in one place.

```
distl-apps/
├── src/                          # All the app code
│   ├── App.jsx                   # Main router — defines all pages/URLs
│   ├── main.jsx                  # Entry point (boots React)
│   ├── components/               # Reusable UI pieces (buttons, modals, etc.)
│   ├── features/                 # Feature-specific pages
│   │   ├── hub/                  # Dashboard & client list
│   │   ├── okr/                  # OKR Planner
│   │   └── sitemap/              # Sitemap Tool (SEO Foundations)
│   ├── hooks/                    # Data fetching (auth, clients, Supabase)
│   ├── lib/                      # Utilities, constants, mock data
│   │   └── sitemap/              # Sitemap Tool logic (CSV, tree, importers, exports)
│   └── styles/                   # Global CSS (Tailwind)
├── supabase/                     # Database migrations (SQL files)
│   └── migrations/               # Run these in order to set up the DB
├── index.html                    # HTML shell
├── package.json                  # Dependencies and scripts
├── vite.config.js                # Build tool config
├── tailwind.config.js            # Tailwind CSS config
├── vercel.json                   # Vercel deployment config
├── CLAUDE.md                     # This file (instructions for Claude Code)
├── WORKFLOW.md                   # Plain-English guide for Jack
└── .env.example                  # Environment variable template
```

### Key commands

```bash
pnpm install     # Install dependencies (run after cloning or adding packages)
pnpm dev         # Start local dev server at http://localhost:3000
pnpm build       # Build for production (Vercel runs this automatically)
pnpm preview     # Preview the production build locally
```

---

## The Hub (Central Dashboard)

The hub is where users land after login. The sidebar lists every active client at the bottom: the client name opens their overview, the chevron expands their tools. New clients are added from the Clients list, the Sitemap Tool home or the OKR Planner home (shared `NewClientModal`).

The hub shows platform-wide numbers pulled from both apps (`useHubStats`, which pages past Supabase's 1000-row cap):

1. **Delivered** — tasks delivered (tasks inside actioned objectives), active clients, pages improved
2. **Latest reviews** — priority keywords improved, keywords improved, Search Console clicks and impressions with change, comparing each client's latest review to the one before
3. **App launcher**

Money and hour figures stay out of the hub; they live in the OKR Planner where they are planned.

### Client Overview (`/clients/:clientId`)

The CEO view of one client: every sitemap review period side by side with clicks, impressions, average position across all tracked keywords and across priority keywords, the OKR objectives and tasks whose months overlap that review, and the pages that moved underneath. Reviews and OKR periods are matched by overlapping dates, so the two line up without being locked together; periods with no counterpart still appear.

Clicks are Search Console clicks, not GA4 sessions. "Tasks" counts tasks in objectives; objectives show actioned of planned, since tasks carry no individual completion flag.

### Client View in Hub

Each client card shows:

- Client name and abbreviation
- Monthly retainer
- Which apps have data for this client (icon badges)
- Quick links to jump into each app for that client

---

## Apps

### OKR Planner (`src/features/okr/`)

**Purpose:** Plan how retainer hours are allocated each quarter

**Key features:**

- Convert monthly retainer to hours ($180/hr)
- Allocate hours across objectives and tasks
- Track AM vs SEO hour split (target: 40% / 60%)
- 10% buffer for ad hoc work
- Objective templates for common SEO work
- Optional crosslink: an objective scoped to pages or a keyword group can name the sitemap pages it works on (`okr_objective_pages`), which feeds the client overview. Entirely optional — the free-text scope detail still works, and clients with no sitemap are unaffected
- Dual view: Internal (full detail) vs Client (simplified)
- Export tasks to Monday.com format
- Period-based: Q1, Q2, etc. with history

**Status:** Prototype complete, connected to Supabase

### Sitemap Tool (`src/features/sitemap/`)

**Purpose:** The SEO Foundations sitemap for a client, kept as one editable page tree, then reviewed against real performance data over time. Everything the client sees comes from this one tree.

**Key features:**

- One sitemap per client. Pages carry name, URL, status (keep / add / opportunity / functional), page template, a keyword cluster with exactly one primary keyword, title tag, meta description and H1
- Hierarchy is derived from the URL path (`/about/our-people/` nests under `/about/`), so editing a URL moves the page; children can follow with a confirm
- Four tabs from the same tree: Sitemap (tree or table), Keyword Research, URL Architecture, Templates
- Detail side panel with every field editable in place; edits autosave through Supabase like the OKR planner
- **Template in, then fully editable:** the SEO Foundations CSVs (proposed sitemap, keyword clusters, optional metadata sheet) land the whole tree. Re-importing shows a diff and never overwrites edits unless chosen
- **Versions:** the planning version plus any number of review versions, each named after the period it covers (e.g. Jul – Sep 2026) and ordered by that period. Search Console queries attach to pages by page URL when the export has one, else by exact keyword, else by containing a tracked keyword (marked inferred). A review takes Search Console Pages and Queries CSVs, an Ahrefs or SEMrush rank tracking export and optionally refreshed volumes. Pages and keywords the files reveal are offered as additions, so the tree can start from nothing. Nothing unmatched is dropped; it is kept with the version for review
- **Board layout:** pages move left/right (columns) and up/down with hover arrows; "Show under" groups a page into another column visually without changing its URL. The table view reads the board left to right
- **Starting points:** the live site's sitemap.xml (fetched through `api/sitemap/fetch.js`), an uploaded sitemap.xml, the SEO Foundations CSVs, a WordPress import CSV, or review uploads
- **Bulk edit tracked keywords:** tick to remove across a page or the whole sitemap
- **Ongoing use:** filters (Priority keywords, Tracked keywords), a Priority flag per page that lightly emphasises hubs being worked on, and Site / Hubs / All pages roll-ups that sum clicks, impressions and volume up the tree ("20 of 20 pages"). Arriving at a sitemap opens the Sitemap tab on the latest version with Priority keywords on, Hubs roll-up and Tree view. Templates and URL Architecture only show on the SEO Foundations version
- **Exports:** WordPress import CSV (fixed format, see `reference/seo-foundations/`), plus the tool's own sitemap and keyword cluster CSVs which re-import cleanly
- Review cadence per client: Quarterly / Biannual / Annual

**Logic lives in `src/lib/sitemap/`** (CSV parsing, tree derivation, importers, matching, exports). Run `pnpm test:sitemap` after touching it; the parity test proves the WordPress export is byte-identical to the reference file.

**Status:** Built, connected to Supabase (migrations 015 to 019). Needs real-client testing.

### Future App Ideas

- **Reporting Dashboard** — Generate monthly client reports
- **Keyword Tracker** — Track ranking positions over time
- **Content Planner** — Plan blog posts and content calendar
- **Competitor Monitor** — Track competitor rankings
- **GEO Tracker** — Track AI/generative search visibility

---

## Database (Supabase)

### Core Tables

```
clients
├── id (uuid, primary key)
├── name (text)
├── abbreviation (text, 3-5 chars)
├── monthly_retainer (integer, dollars)
├── is_active (boolean)
├── created_at (timestamp)
└── updated_at (timestamp)

team_members
├── id (uuid, primary key)
├── email (text)
├── name (text)
├── role (text: 'admin', 'am', 'seo')
├── avatar_url (text, nullable)
└── created_at (timestamp)
```

### App-Specific Tables

```sql
-- OKR Planner
okr_periods (client_id, start_date, end_date, goal, is_published, ...)
okr_objectives (period_id, title, scope, ...)
okr_tasks (objective_id, description, am_hours, seo_hours, status, ...)
okr_objective_pages (objective_id, page_id)   -- optional link to Sitemap Tool pages

-- Sitemap Tool
sitemaps (client_id, review_cadence, menus, ...)
sitemap_page_templates (sitemap_id, code, name, description, blocks, ...)
sitemap_pages (sitemap_id, name, url, status, template_id, title_tag, meta_description, h1, post_type, group_parent_id, is_priority, ...)
sitemap_keywords (page_id, keyword, volume, is_primary, ...)
sitemap_versions (sitemap_id, name, type, period_start, period_end, ...)
sitemap_version_uploads / _page_metrics / _keyword_positions / _queries (per version performance rows)
```

### Authentication

- Supabase Auth with email/password
- Team members only (no client logins — we present to clients)
- Role-based: Admin, Account Manager (AM), SEO Specialist
- All apps share the same auth session

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 |
| Build | Vite |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| Hosting | Vercel |
| Package Manager | pnpm |

---

## URL Structure

```
/                     # Hub (dashboard)
/clients              # All clients list
/clients/:clientId    # Client overview (what we did vs what moved)
/okr                  # OKR Planner home
/okr/:clientId        # OKR for specific client
/sitemap              # Sitemap Tool home
/sitemap/:clientId    # Sitemap Tool for specific client
```

---

## Key Principles

1. **Clients are central** — Everything links back to clients
2. **Internal-first** — Built for the team, not client self-serve
3. **Dual views** — Apps can have internal vs client-facing modes
4. **Hours matter** — Many features relate to tracking billable time
5. **Less, but better** — Keep it simple but not stupid (Distl value!)
6. **Play the long game** — Build for sustainability, not just speed

---

## Current Status

- [x] OKR Planner — Prototype complete, connected to Supabase
- [x] Security — Auth gate, RLS policies, security headers
- [ ] Hub — Basic dashboard exists, needs work
- [x] Sitemap Tool — Built (SEO Foundations sitemap, keyword clusters, reviews, WordPress export)
- [ ] Full authentication — Login works, needs polish

---

*Last updated: September 2026*
