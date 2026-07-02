-- Seed the default Task Library & Objective Templates
-- Depends on: 003_task_library.sql
--
-- Mirrors the hardcoded defaults in src/lib/taskLibrary.js so a fresh
-- database has the same starting library the app previously seeded in
-- memory. Guarded: only seeds when the library is empty, so it is safe
-- to run against an already-populated database.

do $$
begin
  if not exists (select 1 from task_library) then

    -- ── Tasks ──────────────────────────────────────────────────
    insert into task_library (name, default_am_hours, default_seo_hours, sort_order) values
      ('Keyword Research', 0.5, 3.5, 0),
      ('Keyword Mapping', 0, 2, 1),
      ('On-Page SEO Audit', 0.5, 3, 2),
      ('Title Tag & Meta Description Optimisation', 0, 2.5, 3),
      ('Internal Linking Improvements', 0, 2, 4),
      ('Content Gap Analysis', 0.5, 2.5, 5),
      ('Content Brief Creation', 1, 2, 6),
      ('Content Review & Optimisation', 0.5, 2, 7),
      ('Technical Site Audit', 0.5, 3.5, 8),
      ('Core Web Vitals Audit', 0, 3, 9),
      ('Schema Markup Implementation', 0, 3, 10),
      ('Sitemap & Robots.txt Review', 0, 1, 11),
      ('URL Structure & Redirect Audit', 0, 2.5, 12),
      ('Image Optimisation', 0, 2, 13),
      ('Google Business Profile Optimisation', 0.5, 2, 14),
      ('Local Citation Building', 0, 3, 15),
      ('Review Management Strategy', 1, 1, 16),
      ('Backlink Audit', 0, 3, 17),
      ('Link Building Outreach', 0.5, 3.5, 18),
      ('Competitor Analysis', 0.5, 3, 19),
      ('Google Search Console Analysis', 0.5, 2, 20),
      ('Analytics Review & Insights', 1, 2, 21),
      ('Landing Page Optimisation', 0.5, 2.5, 22),
      ('Page Speed Optimisation', 0, 3, 23),
      ('SERP Feature Analysis', 0.5, 2, 24);

    -- ── Templates ──────────────────────────────────────────────
    insert into objective_templates (title, default_scope, sort_order) values
      ('Technical Website Optimisations', 'sitewide', 0),
      ('On-Page SEO Optimisation', 'specific-pages', 1),
      ('Content Strategy & Creation', 'sitewide', 2),
      ('Local SEO & Google Business Profile', 'sitewide', 3),
      ('Keyword Research & Strategy', 'sitewide', 4),
      ('Link Building & Authority', 'sitewide', 5),
      ('Google Business Profile Audit', 'sitewide', 6),
      ('Analytics & Reporting Setup', 'sitewide', 7),
      ('Site Speed & Performance', 'sitewide', 8),
      ('Competitor Analysis & Benchmarking', 'sitewide', 9),
      ('Landing Page Optimisation', 'specific-pages', 10);

    -- ── Template → task links ──────────────────────────────────
    insert into objective_template_tasks (template_id, task_id, sort_order)
    select t.id, k.id, x.ord
    from (values
      ('Technical Website Optimisations', 'Technical Site Audit', 0),
      ('Technical Website Optimisations', 'Core Web Vitals Audit', 1),
      ('Technical Website Optimisations', 'Schema Markup Implementation', 2),
      ('Technical Website Optimisations', 'Sitemap & Robots.txt Review', 3),
      ('Technical Website Optimisations', 'URL Structure & Redirect Audit', 4),
      ('On-Page SEO Optimisation', 'On-Page SEO Audit', 0),
      ('On-Page SEO Optimisation', 'Title Tag & Meta Description Optimisation', 1),
      ('On-Page SEO Optimisation', 'Internal Linking Improvements', 2),
      ('On-Page SEO Optimisation', 'Image Optimisation', 3),
      ('Content Strategy & Creation', 'Content Gap Analysis', 0),
      ('Content Strategy & Creation', 'Content Brief Creation', 1),
      ('Content Strategy & Creation', 'Content Review & Optimisation', 2),
      ('Local SEO & Google Business Profile', 'Google Business Profile Optimisation', 0),
      ('Local SEO & Google Business Profile', 'Local Citation Building', 1),
      ('Local SEO & Google Business Profile', 'Review Management Strategy', 2),
      ('Keyword Research & Strategy', 'Keyword Research', 0),
      ('Keyword Research & Strategy', 'Keyword Mapping', 1),
      ('Keyword Research & Strategy', 'SERP Feature Analysis', 2),
      ('Link Building & Authority', 'Backlink Audit', 0),
      ('Link Building & Authority', 'Link Building Outreach', 1),
      ('Link Building & Authority', 'Competitor Analysis', 2),
      ('Google Business Profile Audit', 'Google Business Profile Optimisation', 0),
      ('Google Business Profile Audit', 'Review Management Strategy', 1),
      ('Analytics & Reporting Setup', 'Google Search Console Analysis', 0),
      ('Analytics & Reporting Setup', 'Analytics Review & Insights', 1),
      ('Site Speed & Performance', 'Core Web Vitals Audit', 0),
      ('Site Speed & Performance', 'Page Speed Optimisation', 1),
      ('Site Speed & Performance', 'Image Optimisation', 2),
      ('Competitor Analysis & Benchmarking', 'Competitor Analysis', 0),
      ('Competitor Analysis & Benchmarking', 'SERP Feature Analysis', 1),
      ('Competitor Analysis & Benchmarking', 'Keyword Research', 2),
      ('Landing Page Optimisation', 'Landing Page Optimisation', 0),
      ('Landing Page Optimisation', 'On-Page SEO Audit', 1),
      ('Landing Page Optimisation', 'Content Review & Optimisation', 2)
    ) as x(tpl_title, task_name, ord)
    join objective_templates t on t.title = x.tpl_title
    join task_library k on k.name = x.task_name;

  end if;
end $$;
