-- Task Library & Objective Templates
-- Depends on: 001_core_tables.sql

-- Reusable task definitions the SEO lead maintains
create table if not exists task_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_am_hours numeric(5,1) not null default 0,
  default_seo_hours numeric(5,1) not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Predefined objective groupings (templates)
create table if not exists objective_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  default_scope text not null default 'sitewide' check (default_scope in ('sitewide', 'specific-pages', 'keyword-group')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Junction: which tasks belong to which template
create table if not exists objective_template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references objective_templates(id) on delete cascade,
  task_id uuid not null references task_library(id) on delete cascade,
  sort_order integer not null default 0
);

-- RLS
alter table task_library enable row level security;
alter table objective_templates enable row level security;
alter table objective_template_tasks enable row level security;

-- Anon policies for development (remove when auth is wired up)
create policy "Anon can read task_library" on task_library for select to anon using (true);
create policy "Anon can manage task_library" on task_library for all to anon using (true);

create policy "Anon can read objective_templates" on objective_templates for select to anon using (true);
create policy "Anon can manage objective_templates" on objective_templates for all to anon using (true);

create policy "Anon can read objective_template_tasks" on objective_template_tasks for select to anon using (true);
create policy "Anon can manage objective_template_tasks" on objective_template_tasks for all to anon using (true);
