-- Sitemap Tool: how a Search Console query was attributed to its page
--   page     — the export carried the page URL
--   exact    — the query equals a tracked keyword on the page
--   inferred — the query contains a tracked keyword on the page (longest match)
-- Depends on: 015_sitemap_tool.sql

alter table sitemap_version_queries
  add column if not exists attribution text not null default 'exact'
  check (attribution in ('page', 'exact', 'inferred'));
