-- Sitemap Tool tables
-- Depends on: 001_core_tables.sql

create table if not exists sitemaps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  domain text not null,
  last_synced timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sitemap_pages (
  id uuid primary key default gen_random_uuid(),
  sitemap_id uuid not null references sitemaps(id) on delete cascade,
  parent_id uuid references sitemap_pages(id) on delete set null,
  url text not null,
  title text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists sitemap_metrics (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references sitemap_pages(id) on delete cascade,
  period text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  position numeric(5,1),
  created_at timestamptz not null default now()
);

-- Triggers
create trigger sitemaps_updated_at
  before update on sitemaps
  for each row execute function update_updated_at();

-- RLS
alter table sitemaps enable row level security;
alter table sitemap_pages enable row level security;
alter table sitemap_metrics enable row level security;

create policy "Authenticated users can read sitemaps"
  on sitemaps for select to authenticated using (true);

create policy "Authenticated users can manage sitemaps"
  on sitemaps for all to authenticated using (true);

create policy "Authenticated users can read sitemap pages"
  on sitemap_pages for select to authenticated using (true);

create policy "Authenticated users can manage sitemap pages"
  on sitemap_pages for all to authenticated using (true);

create policy "Authenticated users can read sitemap metrics"
  on sitemap_metrics for select to authenticated using (true);

create policy "Authenticated users can manage sitemap metrics"
  on sitemap_metrics for all to authenticated using (true);
