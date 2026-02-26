-- Core tables shared across all apps
-- Run this first when setting up the Supabase project

-- Clients table
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  abbreviation text not null check (char_length(abbreviation) between 2 and 5),
  monthly_retainer integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Team members table
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role text not null check (role in ('admin', 'am', 'seo')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-update updated_at on clients
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_updated_at
  before update on clients
  for each row execute function update_updated_at();

-- Row Level Security
alter table clients enable row level security;
alter table team_members enable row level security;

-- Allow authenticated users to read all clients and team members
create policy "Authenticated users can read clients"
  on clients for select
  to authenticated
  using (true);

create policy "Authenticated users can read team members"
  on team_members for select
  to authenticated
  using (true);

-- Only admins can insert/update/delete clients
create policy "Admins can manage clients"
  on clients for all
  to authenticated
  using (
    exists (
      select 1 from team_members
      where team_members.id = auth.uid()
      and team_members.role = 'admin'
    )
  );

-- Temporary dev policies for anon access (remove when auth is wired up)
create policy "Anon can read clients"
  on clients for select to anon using (true);

create policy "Anon can insert clients"
  on clients for insert to anon with check (true);

create policy "Anon can update clients"
  on clients for update to anon using (true);
