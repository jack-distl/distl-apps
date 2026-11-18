-- Sitemap Tool: module colours for the Templates tab.
--
-- Every section name on a sitemap's templates gets a colour, the same in
-- every template on that sitemap, so a module reads as the same thing
-- wherever it appears. Keyed by the section name in lower case:
--   { "faq": { "color": "sage" }, "cta section": { "color": "blush", "fill": true, "pinned": true } }
-- color  one of the palette keys in src/lib/sitemap/templateBlocks.js
-- fill   true for a filled block (loud, e.g. CTAs), else an outline on white
-- pinned true when someone chose the colour by hand
-- Safe to run more than once.

alter table sitemaps add column if not exists module_colours jsonb not null default '{}'::jsonb;
