-- Sitemap Tool: priority flag on pages (the hubs / pages actively being worked on)
-- Depends on: 015_sitemap_tool.sql

alter table sitemap_pages
  add column if not exists is_priority boolean not null default false;
