# Distl Platform

Internal tools platform for Distl — a full-service digital marketing agency in Perth, Western Australia.

**Tagline:** Brand Purity. Digital Potency.

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

## Platform Architecture

```
distl-platform/
├── packages/
│   ├── hub/                  # Central dashboard (home base)
│   ├── okr-planner/          # Quarterly objective & hour planning
│   ├── sitemap-tool/         # Visual sitemap with GSC data
│   ├── shared/               # Shared code across all apps
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # useClients, useAuth, useSupabase
│   │   ├── lib/              # Supabase client, utilities
│   │   └── styles/           # Shared Tailwind config, brand tokens
│   └── [future-apps]/
├── supabase/                 # Database migrations & types
├── CLAUDE.md                 # This file
└── package.json              # Monorepo root
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

### OKR Planner (`packages/okr-planner`)

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

**Status:** Prototype complete, needs Supabase integration

### Sitemap Tool (`packages/sitemap-tool`)

**Purpose:** Visualise website structure with real Search Console data

**Key features:**

- Interactive tree view of site hierarchy
- Traffic and ranking data per page (from GSC)
- Keyword data overlay
- Expand/collapse sections
- Compare periods (this quarter vs last)

**Status:** Exists separately, needs integration

### Future App Ideas

- **Reporting Dashboard** — Generate monthly client reports
- **Keyword Tracker** — Track ranking positions over time
- **Content Planner** — Plan blog posts and content calendar
- **Competitor Monitor** — Track competitor rankings
- **GEO Tracker** — Track AI/generative search visibility

---

## Shared Database (Supabase)

### Core Tables (used by all apps)

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

Each app owns its own tables, linked to clients via `client_id`:

```sql
-- OKR Planner
okr_periods (client_id, start_date, end_date, goal, is_published, ...)
okr_objectives (period_id, title, scope, ...)
okr_tasks (objective_id, description, am_hours, seo_hours, status, ...)

-- Sitemap Tool
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
| Monorepo | pnpm workspaces |

### Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: '#E8806A',
          dark: '#D66B55',
          light: '#F2A090',
        },
        charcoal: '#1A1A1A',
        cream: '#FAF9F7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
}
```

---

## Shared Components (`packages/shared`)

Build these once, use everywhere:

```
components/
├── Header.jsx          # Top nav with Distl logo, user menu
├── Sidebar.jsx         # App navigation
├── ClientCard.jsx      # Client display card
├── ClientSelector.jsx  # Dropdown to pick client
├── Modal.jsx           # Reusable modal wrapper
├── Button.jsx          # Styled button (coral primary)
├── Badge.jsx           # Status/scope badges
├── LoadingSpinner.jsx  # Loading state
└── EmptyState.jsx      # No data placeholder
```

---

## URL Structure

```
distl-platform.vercel.app/
├── /                     # Hub (dashboard)
├── /clients              # All clients list
├── /clients/[id]         # Single client overview
├── /okr                  # OKR Planner
├── /okr/[client-id]      # OKR for specific client
├── /sitemap              # Sitemap tool
├── /sitemap/[client-id]  # Sitemap for specific client
└── /settings             # User/team settings
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

- [x] OKR Planner — Prototype complete, needs Supabase
- [ ] Hub — Not started
- [ ] Sitemap Tool — Exists separately, needs integration
- [ ] Shared components — Not extracted yet
- [ ] Authentication — Not implemented
- [ ] Database — Schema designed, not deployed

## Immediate Next Steps

1. Set up Supabase project and create core tables
2. Build basic auth flow
3. Create the Hub with client list
4. Move OKR Planner into platform structure
5. Connect OKR Planner to Supabase
6. Deploy to Vercel

---

*Last updated: February 2026*
