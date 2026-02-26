-- Lock down RLS: remove all anonymous access policies
-- After this migration, only authenticated users can access data.
-- Run this BEFORE deploying auth to production.

-- ============================================================
-- 1. Drop anon policies on clients (from 001_core_tables.sql)
-- ============================================================
drop policy if exists "Anon can read clients" on clients;
drop policy if exists "Anon can insert clients" on clients;
drop policy if exists "Anon can update clients" on clients;

-- The admin-only write policy from 001 checks team_members.role = 'admin',
-- but team_members won't be populated yet. Add a temporary authenticated
-- write policy so the team can still manage clients after logging in.
create policy "Authenticated users can manage clients"
  on clients for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- 2. Drop anon policies on OKR tables (from 002_okr_tables.sql)
-- ============================================================
drop policy if exists "Anon can read okr_periods" on okr_periods;
drop policy if exists "Anon can manage okr_periods" on okr_periods;
drop policy if exists "Anon can read okr_objectives" on okr_objectives;
drop policy if exists "Anon can manage okr_objectives" on okr_objectives;
drop policy if exists "Anon can read okr_key_results" on okr_key_results;
drop policy if exists "Anon can manage okr_key_results" on okr_key_results;

-- Add authenticated policies (matching sitemap tables pattern)
create policy "Authenticated users can read okr_periods"
  on okr_periods for select to authenticated using (true);
create policy "Authenticated users can manage okr_periods"
  on okr_periods for all to authenticated using (true);

create policy "Authenticated users can read okr_objectives"
  on okr_objectives for select to authenticated using (true);
create policy "Authenticated users can manage okr_objectives"
  on okr_objectives for all to authenticated using (true);

create policy "Authenticated users can read okr_key_results"
  on okr_key_results for select to authenticated using (true);
create policy "Authenticated users can manage okr_key_results"
  on okr_key_results for all to authenticated using (true);

-- ============================================================
-- 3. Drop anon policies on task library (from 003_task_library.sql)
-- ============================================================
drop policy if exists "Anon can read task_library" on task_library;
drop policy if exists "Anon can manage task_library" on task_library;
drop policy if exists "Anon can read objective_templates" on objective_templates;
drop policy if exists "Anon can manage objective_templates" on objective_templates;
drop policy if exists "Anon can read objective_template_tasks" on objective_template_tasks;
drop policy if exists "Anon can manage objective_template_tasks" on objective_template_tasks;

-- Add authenticated policies
create policy "Authenticated users can read task_library"
  on task_library for select to authenticated using (true);
create policy "Authenticated users can manage task_library"
  on task_library for all to authenticated using (true);

create policy "Authenticated users can read objective_templates"
  on objective_templates for select to authenticated using (true);
create policy "Authenticated users can manage objective_templates"
  on objective_templates for all to authenticated using (true);

create policy "Authenticated users can read objective_template_tasks"
  on objective_template_tasks for select to authenticated using (true);
create policy "Authenticated users can manage objective_template_tasks"
  on objective_template_tasks for all to authenticated using (true);
