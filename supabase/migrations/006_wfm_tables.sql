-- WorkflowMax (WFM) / Xero Practice Manager (XPM) integration tables
-- Stores synced job data from WFM for the Hours app.

-- ============================================================
-- 1. Add WFM client mapping to existing clients table
-- ============================================================
alter table clients add column if not exists wfm_client_id text;
alter table clients add column if not exists wfm_client_name text;

-- ============================================================
-- 2. wfm_connections — OAuth tokens (singleton for the agency)
-- ============================================================
create table if not exists wfm_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scopes text not null default '',
  connected_by uuid references team_members(id),
  last_sync_at timestamptz,
  last_sync_status text check (last_sync_status in ('success', 'error', 'in_progress')),
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger wfm_connections_updated_at
  before update on wfm_connections
  for each row execute function update_updated_at();

alter table wfm_connections enable row level security;

create policy "Authenticated users can read wfm_connections"
  on wfm_connections for select to authenticated using (true);
create policy "Authenticated users can manage wfm_connections"
  on wfm_connections for all to authenticated using (true);

-- ============================================================
-- 3. wfm_jobs — synced jobs from WorkflowMax
--    used_hours is the sum of billable time entries, synced as a total
-- ============================================================
create table if not exists wfm_jobs (
  id uuid primary key default gen_random_uuid(),
  wfm_job_id text unique not null,
  wfm_job_number text,
  client_id uuid references clients(id) on delete set null,
  wfm_client_id text,
  name text not null,
  description text,
  state text not null default 'In Progress',
  start_date date,
  due_date date,
  budget_hours numeric(10,2) default 0,
  used_hours numeric(10,2) default 0,
  budget_amount numeric(12,2) default 0,
  budget_type text,
  category text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger wfm_jobs_updated_at
  before update on wfm_jobs
  for each row execute function update_updated_at();

create index idx_wfm_jobs_client on wfm_jobs(client_id);
create index idx_wfm_jobs_wfm_client on wfm_jobs(wfm_client_id);
create index idx_wfm_jobs_state on wfm_jobs(state);

alter table wfm_jobs enable row level security;

create policy "Authenticated users can read wfm_jobs"
  on wfm_jobs for select to authenticated using (true);
create policy "Authenticated users can manage wfm_jobs"
  on wfm_jobs for all to authenticated using (true);

-- ============================================================
-- 4. wfm_sync_log — audit trail of sync runs
-- ============================================================
create table if not exists wfm_sync_log (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'success', 'error')),
  jobs_synced integer default 0,
  error_message text,
  triggered_by text default 'manual'
);

alter table wfm_sync_log enable row level security;

create policy "Authenticated users can read wfm_sync_log"
  on wfm_sync_log for select to authenticated using (true);
create policy "Authenticated users can manage wfm_sync_log"
  on wfm_sync_log for all to authenticated using (true);
