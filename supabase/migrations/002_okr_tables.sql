-- OKR Planner tables
-- Depends on: 001_core_tables.sql

create table if not exists okr_periods (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  goal text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists okr_objectives (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references okr_periods(id) on delete cascade,
  title text not null,
  scope text not null check (scope in ('am', 'seo', 'shared')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists okr_tasks (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references okr_objectives(id) on delete cascade,
  description text not null,
  am_hours numeric(5,1) not null default 0,
  seo_hours numeric(5,1) not null default 0,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'done')),
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
alter table okr_tasks enable row level security;

create policy "Authenticated users can read OKR data"
  on okr_periods for select to authenticated using (true);

create policy "Authenticated users can manage OKR periods"
  on okr_periods for all to authenticated using (true);

create policy "Authenticated users can read objectives"
  on okr_objectives for select to authenticated using (true);

create policy "Authenticated users can manage objectives"
  on okr_objectives for all to authenticated using (true);

create policy "Authenticated users can read tasks"
  on okr_tasks for select to authenticated using (true);

create policy "Authenticated users can manage tasks"
  on okr_tasks for all to authenticated using (true);
