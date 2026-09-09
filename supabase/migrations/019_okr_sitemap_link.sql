-- Crosslink: an OKR objective can name the sitemap pages it works on.
-- Optional throughout — objectives still work with free-text scope detail
-- and for clients with no sitemap.
-- Depends on: 002_okr_tables.sql, 015_sitemap_tool.sql

create table if not exists okr_objective_pages (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references okr_objectives(id) on delete cascade,
  page_id uuid not null references sitemap_pages(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (objective_id, page_id)
);

create index if not exists idx_okr_objective_pages_objective on okr_objective_pages(objective_id);
create index if not exists idx_okr_objective_pages_page on okr_objective_pages(page_id);

alter table okr_objective_pages enable row level security;

create policy "Authenticated users can read okr_objective_pages"
  on okr_objective_pages for select to authenticated using (true);
create policy "Authenticated users can manage okr_objective_pages"
  on okr_objective_pages for all to authenticated using (true) with check (true);
