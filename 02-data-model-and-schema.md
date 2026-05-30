# 02 — Data Model and Supabase Schema

This is the spine of the build. The board, the backend library, the tailoring and the checkpoints all come out of this model. Align table and column names with the existing repo conventions if they differ, but keep the relationships.

## Entities (plain English)

- **Domain** — a column. Five of them by default. Editable in the backend.
- **Library element** — one entry in the comprehensive backend library, belonging to a domain. Carries default text the team can reuse. This is the master list.
- **Industry template** — a named starting selection of library elements for an industry (builder, law firm, hospitality, e-commerce, and so on), with suggested ordering.
- **Client** — a business Distl is building a Blueprint for. Has a goal statement and a share token.
- **Client element** — a library element placed on a specific client's board, with that client's status, the three fields, ordering and optional phase. Can also be a bespoke element not drawn from the library.
- **Checkpoint** — a saved snapshot of a client's board at a point in time, for history and the "you were here in January" comparison.
- **Profile** — a Distl team member (internal user), via Supabase Auth.

## Relationships

- A domain has many library elements.
- A library element can belong to many industry templates (through template_elements).
- A client optionally starts from one industry template.
- A client has many client elements.
- A client element references one domain, and optionally one library element (null when bespoke).
- A client has many checkpoints.

## Enumerations

- **status**: `green`, `amber`, `grey`
- **phase** (optional sequencing tag): `now`, `next`, `later`
- **client_stage** (the board's mode): `draft`, `proposal`, `live`

## Status meanings (encode as a reference, surface in UI)

- green: in place and competitive for the client's goal.
- amber: happening, but not yet at the level the goal needs.
- grey: not started yet. A sequenced future move.

## Postgres / Supabase DDL (starting point)

```sql
create type bp_status as enum ('green', 'amber', 'grey');
create type bp_phase as enum ('now', 'next', 'later');
create type bp_client_stage as enum ('draft', 'proposal', 'live');

create table domains (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  outcome_line text,            -- short subtitle, e.g. "people find you, not your competitor"
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table library_elements (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references domains(id) on delete restrict,
  title text not null,                 -- the outcome headline shown on the card
  default_recommend text,              -- e.g. "SEO retainer, tier one"
  default_why text,                    -- starter "why we need it"
  default_examples text,               -- starter "example inclusions"
  default_phase bp_phase,
  tags text[] default '{}',            -- industry / use tags for filtering
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table industry_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true
);

create table template_elements (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references industry_templates(id) on delete cascade,
  library_element_id uuid not null references library_elements(id) on delete cascade,
  suggested_status bp_status default 'grey',
  suggested_phase bp_phase,
  sort_order int not null default 0,
  unique (template_id, library_element_id)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  industry_template_id uuid references industry_templates(id) on delete set null,
  goal_statement text,                 -- the aspiration anchor
  stage bp_client_stage not null default 'draft',
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  share_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table client_elements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  domain_id uuid not null references domains(id) on delete restrict,
  library_element_id uuid references library_elements(id) on delete set null, -- null = bespoke
  title text not null,                 -- copied from library, editable per client
  recommend text,                      -- "what we'd recommend", client-facing
  why text,                            -- "why we need it"
  examples text,                       -- "example inclusions" (text + plain URLs)
  status bp_status not null default 'grey',
  phase bp_phase,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table checkpoints (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  version int not null,
  label text,                          -- e.g. "March 2026 review"
  snapshot jsonb not null,             -- full board state at this point
  created_at timestamptz not null default now(),
  unique (client_id, version)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'team',   -- 'team' or 'admin'
  created_at timestamptz not null default now()
);
```

## How tailoring works in the model

1. Team creates a client and optionally picks an industry template.
2. If a template is chosen, the app copies that template's `template_elements` into `client_elements` for the client (copying title, default_recommend, default_why, default_examples from the referenced library element, and the suggested status and phase).
3. The team then adds, removes, reorders and edits client elements freely. They can pull any other library element onto the board, or add a bespoke one (library_element_id null).
4. Editing a client element never changes the library. Library defaults are a starting point only.

## Checkpoints / versioning

- When the team wants to mark a review, they create a checkpoint. The app writes the current board state (client + all client_elements) into `checkpoints.snapshot` as JSON, with an incrementing version and a label.
- The client view can show the current board, and optionally a comparison against the previous checkpoint ("here's what moved since January"). The comparison is a beta-nice-to-have, not a beta-blocker. Storing the snapshots from day one is required so the history exists later.

## Access model (beta)

- **Internal users**: authenticated via Supabase Auth. Full read and write on all tables. Use Row Level Security allowing authenticated users with a profile.
- **Client view**: no login. A client board is reachable by its `share_token` only when `share_enabled` is true. Implement read-only public access to a single client's board and its client_elements filtered by token. Do this with a Postgres function (security definer) or a dedicated public read policy keyed on the token, so the anon key can fetch exactly one client's published board and nothing else. Never expose the library, other clients, or the internal fields beyond what the client view needs.

## RLS sketch

- `profiles`, `domains`, `library_elements`, `industry_templates`, `template_elements`, `clients`, `client_elements`, `checkpoints`: authenticated team users can select/insert/update/delete.
- Public (anon) access: only via an RPC such as `get_public_board(token text)` returning the client and its client_elements when `share_enabled` is true. No direct anon select on base tables.
