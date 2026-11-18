-- Sitemap Tool: dynamic field settings per sitemap.
--
-- Templates can use dynamic fields in braces ({Child pages}, {Main
-- categories} ...). This holds the sitemap's own choices:
--   { "mainCategories": [page id, ...] | null,   -- null = every top-level page
--     "custom": [{ "id", "name", "type": "pages" | "text", "pages": [page id], "text" }] }
-- Safe to run more than once.

alter table sitemaps add column if not exists dynamic_fields jsonb not null default '{}'::jsonb;
