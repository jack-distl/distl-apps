-- Sitemap Tool (SEO Foundations)
-- Depends on: 001_core_tables.sql
--
-- Replaces the placeholder sitemap tables from 003_sitemap_tables.sql, which
-- were never wired to any code. One sitemap per client; pages, keywords and
-- page templates hang off it; versions layer performance data over the tree.

-- ============================================================
-- 0. Drop the unused 003 placeholder tables
-- ============================================================
drop table if exists sitemap_metrics cascade;
drop table if exists sitemap_pages cascade;
drop table if exists sitemaps cascade;

-- ============================================================
-- 1. sitemaps — one per client
-- ============================================================
create table sitemaps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references clients(id) on delete cascade,
  domain text,                                  -- e.g. hammondlegal.com.au (used to strip origins from GSC URLs)
  review_cadence text not null default 'quarterly'
    check (review_cadence in ('quarterly', 'biannual', 'annual')),
  menus text[] not null default array[
    'Primary Navigation', 'Footer Navigation', 'Controls Navigation',
    'Legal Navigation', 'Above Primary Navigation'
  ],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sitemaps_updated_at
  before update on sitemaps
  for each row execute function update_updated_at();

-- ============================================================
-- 2. sitemap_page_templates — per sitemap, seeded from defaults
-- ============================================================
create table sitemap_page_templates (
  id uuid primary key default gen_random_uuid(),
  sitemap_id uuid not null references sitemaps(id) on delete cascade,
  code text not null,                           -- short code shown in UI, e.g. T1
  name text not null,                           -- exported as post_title on template rows
  description text not null default '',
  blocks jsonb not null default '[]'::jsonb,    -- wireframe rows: [[{"t":"Hero","c":"hero"}], ...]
  sort_order integer not null default 0,        -- template number in the export = sort_order + 1
  created_at timestamptz not null default now()
);

create index idx_sitemap_page_templates_sitemap on sitemap_page_templates(sitemap_id);

-- ============================================================
-- 3. sitemap_pages — the tree. Hierarchy is derived from url.
-- ============================================================
create table sitemap_pages (
  id uuid primary key default gen_random_uuid(),
  sitemap_id uuid not null references sitemaps(id) on delete cascade,
  name text not null,
  url text not null,                            -- path only, leading and trailing slash, e.g. /about/our-people/
  status text not null default 'keep'
    check (status in ('keep', 'add', 'opportunity', 'functional')),
  template_id uuid references sitemap_page_templates(id) on delete set null,
  title_tag text not null default '',
  meta_description text not null default '',
  h1 text not null default '',
  post_type text not null default 'page' check (post_type in ('page', 'post')),
  menu_names text[],                            -- null = use defaults for the page's position
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sitemap_id, url)
);

create trigger sitemap_pages_updated_at
  before update on sitemap_pages
  for each row execute function update_updated_at();

create index idx_sitemap_pages_sitemap on sitemap_pages(sitemap_id);

-- ============================================================
-- 4. sitemap_keywords — cluster per page, exactly one primary
-- ============================================================
create table sitemap_keywords (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references sitemap_pages(id) on delete cascade,
  keyword text not null,
  volume integer not null default 0,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_sitemap_keywords_page on sitemap_keywords(page_id);
create unique index idx_sitemap_keywords_one_primary
  on sitemap_keywords(page_id) where is_primary;

-- ============================================================
-- 5. sitemap_versions — plan or review; reviews carry performance data
-- ============================================================
create table sitemap_versions (
  id uuid primary key default gen_random_uuid(),
  sitemap_id uuid not null references sitemaps(id) on delete cascade,
  name text not null,
  type text not null default 'plan' check (type in ('plan', 'review')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_sitemap_versions_sitemap on sitemap_versions(sitemap_id);

-- Which uploads fed a version (drives the source strip). Raw files are not
-- stored; parsed rows land in the tables below and unmatched rows are kept
-- here so nothing is silently dropped.
create table sitemap_version_uploads (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references sitemap_versions(id) on delete cascade,
  kind text not null check (kind in ('gsc_pages', 'gsc_queries', 'rankings', 'volumes')),
  filename text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by text,
  row_count integer not null default 0,
  matched_count integer not null default 0,
  unmatched jsonb not null default '[]'::jsonb
);

create index idx_sitemap_version_uploads_version on sitemap_version_uploads(version_id);

-- Per page, per version: GSC page totals.
create table sitemap_version_page_metrics (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references sitemap_versions(id) on delete cascade,
  page_id uuid not null references sitemap_pages(id) on delete cascade,
  clicks integer not null default 0,
  impressions integer not null default 0,
  position numeric(6,1),
  unique (version_id, page_id)
);

create index idx_sitemap_vpm_version on sitemap_version_page_metrics(version_id);

-- Per keyword, per version: rank tracker position.
create table sitemap_version_keyword_positions (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references sitemap_versions(id) on delete cascade,
  keyword_id uuid not null references sitemap_keywords(id) on delete cascade,
  position numeric(6,1),
  ranking_url text,
  unique (version_id, keyword_id)
);

create index idx_sitemap_vkp_version on sitemap_version_keyword_positions(version_id);

-- Per page, per version: GSC queries attributed to the page.
create table sitemap_version_queries (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references sitemap_versions(id) on delete cascade,
  page_id uuid not null references sitemap_pages(id) on delete cascade,
  query text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  position numeric(6,1),
  sort_order integer not null default 0
);

create index idx_sitemap_vq_version_page on sitemap_version_queries(version_id, page_id);

-- ============================================================
-- 6. RLS — authenticated team members can read and manage everything
-- ============================================================
alter table sitemaps enable row level security;
alter table sitemap_page_templates enable row level security;
alter table sitemap_pages enable row level security;
alter table sitemap_keywords enable row level security;
alter table sitemap_versions enable row level security;
alter table sitemap_version_uploads enable row level security;
alter table sitemap_version_page_metrics enable row level security;
alter table sitemap_version_keyword_positions enable row level security;
alter table sitemap_version_queries enable row level security;

create policy "Authenticated users can read sitemaps"
  on sitemaps for select to authenticated using (true);
create policy "Authenticated users can manage sitemaps"
  on sitemaps for all to authenticated using (true) with check (true);

create policy "Authenticated users can read sitemap_page_templates"
  on sitemap_page_templates for select to authenticated using (true);
create policy "Authenticated users can manage sitemap_page_templates"
  on sitemap_page_templates for all to authenticated using (true) with check (true);

create policy "Authenticated users can read sitemap_pages"
  on sitemap_pages for select to authenticated using (true);
create policy "Authenticated users can manage sitemap_pages"
  on sitemap_pages for all to authenticated using (true) with check (true);

create policy "Authenticated users can read sitemap_keywords"
  on sitemap_keywords for select to authenticated using (true);
create policy "Authenticated users can manage sitemap_keywords"
  on sitemap_keywords for all to authenticated using (true) with check (true);

create policy "Authenticated users can read sitemap_versions"
  on sitemap_versions for select to authenticated using (true);
create policy "Authenticated users can manage sitemap_versions"
  on sitemap_versions for all to authenticated using (true) with check (true);

create policy "Authenticated users can read sitemap_version_uploads"
  on sitemap_version_uploads for select to authenticated using (true);
create policy "Authenticated users can manage sitemap_version_uploads"
  on sitemap_version_uploads for all to authenticated using (true) with check (true);

create policy "Authenticated users can read sitemap_version_page_metrics"
  on sitemap_version_page_metrics for select to authenticated using (true);
create policy "Authenticated users can manage sitemap_version_page_metrics"
  on sitemap_version_page_metrics for all to authenticated using (true) with check (true);

create policy "Authenticated users can read sitemap_version_keyword_positions"
  on sitemap_version_keyword_positions for select to authenticated using (true);
create policy "Authenticated users can manage sitemap_version_keyword_positions"
  on sitemap_version_keyword_positions for all to authenticated using (true) with check (true);

create policy "Authenticated users can read sitemap_version_queries"
  on sitemap_version_queries for select to authenticated using (true);
create policy "Authenticated users can manage sitemap_version_queries"
  on sitemap_version_queries for all to authenticated using (true) with check (true);
