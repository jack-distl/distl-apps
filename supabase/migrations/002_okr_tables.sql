-- OKR Planner tables
-- Depends on: 001_core_tables.sql

-- Periods: one per client per quarter
create table if not exists okr_periods (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  start_month integer not null check (start_month between 1 and 12),
  start_year integer not null,
  end_month integer not null check (end_month between 1 and 12),
  end_year integer not null,
  goal text,
  is_published boolean not null default false,
  offsite_allowance_percent numeric(5,2) not null default 5,
  admin_monthly_reporting_am numeric(5,1) not null default 1,
  admin_monthly_reporting_seo numeric(5,1) not null default 2,
  admin_okr_reporting_am numeric(5,1) not null default 1,
  admin_okr_reporting_seo numeric(5,1) not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Objectives within a period
create table if not exists okr_objectives (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references okr_periods(id) on delete cascade,
  title text not null,
  scope text not null check (scope in ('sitewide', 'specific-pages', 'keyword-group')),
  scope_detail text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Key results (tasks) within an objective
create table if not exists okr_key_results (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references okr_objectives(id) on delete cascade,
  task text not null,
  description text not null default '',
  am_hours numeric(5,1) not null default 0,
  seo_hours numeric(5,1) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'complete')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Triggers for updated_at
create trigger okr_periods_updated_at
  before update on okr_periods
  for each row execute function update_updated_at();

-- RLS
alter table okr_periods enable row level security;
alter table okr_objectives enable row level security;
alter table okr_key_results enable row level security;

-- Anon policies for development (remove when auth is wired up)
create policy "Anon can read okr_periods" on okr_periods for select to anon using (true);
create policy "Anon can manage okr_periods" on okr_periods for all to anon using (true);

create policy "Anon can read okr_objectives" on okr_objectives for select to anon using (true);
create policy "Anon can manage okr_objectives" on okr_objectives for all to anon using (true);

create policy "Anon can read okr_key_results" on okr_key_results for select to anon using (true);
create policy "Anon can manage okr_key_results" on okr_key_results for all to anon using (true);
