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
│   │   └── okr/                  # OKR Planner
│   ├── hooks/                    # Data fetching (auth, clients, Supabase)
│   ├── lib/                      # Utilities, constants, mock data
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

The hub is where users land after login. It shows:

1. **Overview stats** — Total clients, active projects, upcoming deadlines
2. **Client list** — All clients with quick access to their data across apps
3. **App launcher** — Grid of available apps
4. **Recent activity** — What's been worked on lately

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
- Dual view: Internal (full detail) vs Client (simplified)
- Export tasks to Monday.com format
- Period-based: Q1, Q2, etc. with history

**Status:** Prototype complete, connected to Supabase

### Sitemap Tool (not yet integrated)

**Purpose:** Visualise website structure with real Search Console data

**Key features:**

- Interactive tree view of site hierarchy
- Traffic and ranking data per page (from GSC)
- Keyword data overlay
- Expand/collapse sections
- Compare periods (this quarter vs last)

**Status:** Exists separately, needs integration into this app

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

-- Sitemap Tool (future)
sitemaps (client_id, domain, last_synced, ...)
sitemap_pages (sitemap_id, url, title, parent_id, ...)
sitemap_metrics (page_id, period, clicks, impressions, position, ...)
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
/okr                  # OKR Planner home
/okr/:clientId        # OKR for specific client
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
- [ ] Sitemap Tool — Exists separately, needs integration
- [ ] Full authentication — Login works, needs polish

---

*Last updated: February 2026*
