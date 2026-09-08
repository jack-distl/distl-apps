-- Sitemap Tool: review periods and visual grouping. WFM Hours removed.
-- Depends on: 015_sitemap_tool.sql

-- ============================================================
-- 1. Review versions carry the period they cover (e.g. Jul – Sep 2026)
-- ============================================================
alter table sitemap_versions
  add column if not exists period_start date,
  add column if not exists period_end date;

-- ============================================================
-- 2. Visual grouping: show a page inside another top-level page's column
--    on the board without changing its URL, hierarchy or the export.
-- ============================================================
alter table sitemap_pages
  add column if not exists group_parent_id uuid references sitemap_pages(id) on delete set null;

create index if not exists idx_sitemap_pages_group_parent on sitemap_pages(group_parent_id);

-- ============================================================
-- 3. WFM Hours app removed: drop its tables and the client mapping columns
-- ============================================================
drop table if exists wfm_sync_log cascade;
drop table if exists wfm_jobs cascade;
drop table if exists wfm_connections cascade;

alter table clients drop column if exists wfm_client_id;
alter table clients drop column if exists wfm_client_name;
