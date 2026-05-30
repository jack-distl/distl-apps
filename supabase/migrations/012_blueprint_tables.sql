-- The Unstoppable Blueprint — schema, RLS and public board RPC
-- Depends on: 001_core_tables.sql (shared `clients` table + update_updated_at())
--
-- A per-client visual strategy board. Five fixed outcome columns (domains),
-- a comprehensive backend library of elements, industry templates that pre-load
-- a starting selection, per-client tailored boards, and checkpoints (snapshots).
--
-- All tables are prefixed `bp_` to avoid collisions with generic platform names.
-- Blueprint data keys off the shared `clients` table (one client list across apps).

-- ── Enums ──────────────────────────────────────────────────────
do $$ begin
  create type bp_status as enum ('green', 'amber', 'grey');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bp_phase as enum ('now', 'next', 'later');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bp_client_stage as enum ('draft', 'proposal', 'live');
exception when duplicate_object then null; end $$;

-- ── Domains (the five columns) ─────────────────────────────────
create table if not exists bp_domains (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,           -- stable key, not edited in-app
  name text not null,                  -- display name, editable in-app
  outcome_line text,                   -- short subtitle, editable in-app
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- ── Library elements (the comprehensive backend master list) ───
create table if not exists bp_library_elements (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references bp_domains(id) on delete restrict,
  title text not null,                 -- outcome headline shown on the card
  default_recommend text,              -- "what we'd recommend" starter (client-facing)
  default_why text,                    -- "why we need it" starter
  default_examples text,               -- "example inclusions" starter
  default_phase bp_phase,
  tags text[] not null default '{}',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Industry templates ─────────────────────────────────────────
create table if not exists bp_industry_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true
);

create table if not exists bp_template_elements (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references bp_industry_templates(id) on delete cascade,
  library_element_id uuid not null references bp_library_elements(id) on delete cascade,
  suggested_status bp_status not null default 'grey',
  suggested_phase bp_phase,
  sort_order int not null default 0,
  unique (template_id, library_element_id)
);

-- ── Blueprints (one per client) ────────────────────────────────
create table if not exists bp_blueprints (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references clients(id) on delete cascade,
  industry_template_id uuid references bp_industry_templates(id) on delete set null,
  goal_statement text,                 -- the aspiration anchor
  stage bp_client_stage not null default 'draft',
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  share_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Client elements (the tailored board) ───────────────────────
create table if not exists bp_client_elements (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references bp_blueprints(id) on delete cascade,
  domain_id uuid not null references bp_domains(id) on delete restrict,
  library_element_id uuid references bp_library_elements(id) on delete set null, -- null = bespoke
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

create index if not exists bp_client_elements_blueprint_idx
  on bp_client_elements (blueprint_id);

-- ── Checkpoints (snapshots) ────────────────────────────────────
create table if not exists bp_checkpoints (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references bp_blueprints(id) on delete cascade,
  version int not null,
  label text,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (blueprint_id, version)
);

-- ── updated_at triggers (reuse shared fn from 001) ─────────────
drop trigger if exists bp_library_elements_updated_at on bp_library_elements;
create trigger bp_library_elements_updated_at
  before update on bp_library_elements
  for each row execute function update_updated_at();

drop trigger if exists bp_blueprints_updated_at on bp_blueprints;
create trigger bp_blueprints_updated_at
  before update on bp_blueprints
  for each row execute function update_updated_at();

drop trigger if exists bp_client_elements_updated_at on bp_client_elements;
create trigger bp_client_elements_updated_at
  before update on bp_client_elements
  for each row execute function update_updated_at();

-- ── Row Level Security ─────────────────────────────────────────
-- Team users (any authenticated user): full access. No anon access to base tables.
alter table bp_domains            enable row level security;
alter table bp_library_elements   enable row level security;
alter table bp_industry_templates enable row level security;
alter table bp_template_elements  enable row level security;
alter table bp_blueprints         enable row level security;
alter table bp_client_elements    enable row level security;
alter table bp_checkpoints        enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'bp_domains','bp_library_elements','bp_industry_templates',
    'bp_template_elements','bp_blueprints','bp_client_elements','bp_checkpoints'
  ]
  loop
    execute format('drop policy if exists "Authenticated full access" on %I;', t);
    execute format(
      'create policy "Authenticated full access" on %I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- ── Public board RPC (the only anon entry point) ───────────────
-- Returns one client's shared board by token, only when share_enabled.
-- Exposes nothing else: not the library, not other clients, not the token.
create or replace function bp_get_public_board(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blueprint bp_blueprints%rowtype;
  v_result jsonb;
begin
  select * into v_blueprint
  from bp_blueprints
  where share_token = p_token and share_enabled = true;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'client_name', (select name from clients where id = v_blueprint.client_id),
    'goal_statement', v_blueprint.goal_statement,
    'stage', v_blueprint.stage,
    'domains', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'slug', d.slug,
        'name', d.name,
        'outcome_line', d.outcome_line,
        'sort_order', d.sort_order
      ) order by d.sort_order)
      from bp_domains d
      where d.is_active = true
    ), '[]'::jsonb),
    'elements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'domain_id', e.domain_id,
        'title', e.title,
        'recommend', e.recommend,
        'why', e.why,
        'examples', e.examples,
        'status', e.status,
        'phase', e.phase,
        'sort_order', e.sort_order
      ) order by e.sort_order)
      from bp_client_elements e
      where e.blueprint_id = v_blueprint.id
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function bp_get_public_board(text) from public;
grant execute on function bp_get_public_board(text) to anon, authenticated;
