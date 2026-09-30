-- SEO plan: Future tasks. Per client, the objectives the team might do one
-- day, filed under a template category instead of a period. Pulled into a
-- period from New period or Add objective (copied, or moved), and an
-- objective can be sent back here from a period.
-- Same shape as the WordPress build (distl-app-wp, DB_VERSION 6).
-- Depends on: 001_core_tables.sql, 002_okr_tables.sql, 011_okr_internal_notes.sql

create table if not exists okr_future_objectives (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  -- A template category name, as objective_templates.category stores it.
  -- Null: uncategorised.
  category text,
  title text not null,
  scope text not null default 'sitewide' check (scope in ('sitewide', 'specific-pages', 'keyword-group')),
  scope_detail text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists okr_future_key_results (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references okr_future_objectives(id) on delete cascade,
  task text not null,
  description text not null default '',
  internal_notes text not null default '',
  am_hours numeric(5,1) not null default 0,
  seo_hours numeric(5,1) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_okr_future_objectives_client on okr_future_objectives(client_id);
create index if not exists idx_okr_future_key_results_objective on okr_future_key_results(objective_id);

create trigger okr_future_objectives_updated_at
  before update on okr_future_objectives
  for each row execute function update_updated_at();

-- Team only, like the rest of the SEO plan (005_lock_down_rls.sql).
alter table okr_future_objectives enable row level security;
alter table okr_future_key_results enable row level security;

create policy "Authenticated users can read okr_future_objectives"
  on okr_future_objectives for select to authenticated using (true);
create policy "Authenticated users can manage okr_future_objectives"
  on okr_future_objectives for all to authenticated using (true) with check (true);

create policy "Authenticated users can read okr_future_key_results"
  on okr_future_key_results for select to authenticated using (true);
create policy "Authenticated users can manage okr_future_key_results"
  on okr_future_key_results for all to authenticated using (true) with check (true);
