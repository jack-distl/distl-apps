-- Seed data for development
-- Depends on: 001, 002, 003

-- ─── Clients ──────────────────────────────────────────────────────
insert into clients (name, abbreviation, monthly_retainer, is_active) values
  ('Acme Construction', 'ACM', 5400, true),
  ('Swan River Brewing', 'SRB', 3600, true),
  ('Perth Dental Group', 'PDG', 7200, true),
  ('Coastal Property Co', 'CPC', 4500, true),
  ('Outback Adventures', 'OBA', 2700, false);


-- ─── Task Library (25 tasks) ──────────────────────────────────────
insert into task_library (name, default_am_hours, default_seo_hours, sort_order) values
  ('Keyword Research', 0.5, 3.5, 1),
  ('Keyword Mapping', 0, 2, 2),
  ('On-Page SEO Audit', 0.5, 3, 3),
  ('Title Tag & Meta Description Optimisation', 0, 2.5, 4),
  ('Internal Linking Improvements', 0, 2, 5),
  ('Content Gap Analysis', 0.5, 2.5, 6),
  ('Content Brief Creation', 1, 2, 7),
  ('Content Review & Optimisation', 0.5, 2, 8),
  ('Technical Site Audit', 0.5, 3.5, 9),
  ('Core Web Vitals Audit', 0, 3, 10),
  ('Schema Markup Implementation', 0, 3, 11),
  ('Sitemap & Robots.txt Review', 0, 1, 12),
  ('URL Structure & Redirect Audit', 0, 2.5, 13),
  ('Image Optimisation', 0, 2, 14),
  ('Google Business Profile Optimisation', 0.5, 2, 15),
  ('Local Citation Building', 0, 3, 16),
  ('Review Management Strategy', 1, 1, 17),
  ('Backlink Audit', 0, 3, 18),
  ('Link Building Outreach', 0.5, 3.5, 19),
  ('Competitor Analysis', 0.5, 3, 20),
  ('Google Search Console Analysis', 0.5, 2, 21),
  ('Analytics Review & Insights', 1, 2, 22),
  ('Landing Page Optimisation', 0.5, 2.5, 23),
  ('Page Speed Optimisation', 0, 3, 24),
  ('SERP Feature Analysis', 0.5, 2, 25);


-- ─── Objective Templates ──────────────────────────────────────────
insert into objective_templates (title, default_scope, sort_order) values
  ('Technical Website Optimisations', 'sitewide', 1),
  ('On-Page SEO Optimisation', 'specific-pages', 2),
  ('Content Strategy & Creation', 'sitewide', 3),
  ('Local SEO & Google Business Profile', 'sitewide', 4),
  ('Keyword Research & Strategy', 'sitewide', 5),
  ('Link Building & Authority', 'sitewide', 6),
  ('Google Business Profile Audit', 'sitewide', 7),
  ('Analytics & Reporting Setup', 'sitewide', 8),
  ('Site Speed & Performance', 'sitewide', 9),
  ('Competitor Analysis & Benchmarking', 'sitewide', 10),
  ('Landing Page Optimisation', 'specific-pages', 11);


-- ─── Template → Task relationships ───────────────────────────────
-- Technical Website Optimisations → Technical Site Audit, Core Web Vitals Audit, Schema Markup, Sitemap & Robots, URL Structure
insert into objective_template_tasks (template_id, task_id, sort_order)
select t.id, tl.id, row_number() over (order by tl.sort_order)
from objective_templates t
cross join task_library tl
where t.title = 'Technical Website Optimisations'
  and tl.name in ('Technical Site Audit', 'Core Web Vitals Audit', 'Schema Markup Implementation', 'Sitemap & Robots.txt Review', 'URL Structure & Redirect Audit');

-- On-Page SEO Optimisation → On-Page SEO Audit, Title Tag & Meta, Internal Linking, Image Optimisation
insert into objective_template_tasks (template_id, task_id, sort_order)
select t.id, tl.id, row_number() over (order by tl.sort_order)
from objective_templates t
cross join task_library tl
where t.title = 'On-Page SEO Optimisation'
  and tl.name in ('On-Page SEO Audit', 'Title Tag & Meta Description Optimisation', 'Internal Linking Improvements', 'Image Optimisation');

-- Content Strategy & Creation → Content Gap Analysis, Content Brief Creation, Content Review
insert into objective_template_tasks (template_id, task_id, sort_order)
select t.id, tl.id, row_number() over (order by tl.sort_order)
from objective_templates t
cross join task_library tl
where t.title = 'Content Strategy & Creation'
  and tl.name in ('Content Gap Analysis', 'Content Brief Creation', 'Content Review & Optimisation');

-- Local SEO & Google Business Profile → GBP Optimisation, Local Citation Building, Review Management
insert into objective_template_tasks (template_id, task_id, sort_order)
select t.id, tl.id, row_number() over (order by tl.sort_order)
from objective_templates t
cross join task_library tl
where t.title = 'Local SEO & Google Business Profile'
  and tl.name in ('Google Business Profile Optimisation', 'Local Citation Building', 'Review Management Strategy');

-- Keyword Research & Strategy → Keyword Research, Keyword Mapping, SERP Feature Analysis
insert into objective_template_tasks (template_id, task_id, sort_order)
select t.id, tl.id, row_number() over (order by tl.sort_order)
from objective_templates t
cross join task_library tl
where t.title = 'Keyword Research & Strategy'
  and tl.name in ('Keyword Research', 'Keyword Mapping', 'SERP Feature Analysis');

-- Link Building & Authority → Backlink Audit, Link Building Outreach, Competitor Analysis
insert into objective_template_tasks (template_id, task_id, sort_order)
select t.id, tl.id, row_number() over (order by tl.sort_order)
from objective_templates t
cross join task_library tl
where t.title = 'Link Building & Authority'
  and tl.name in ('Backlink Audit', 'Link Building Outreach', 'Competitor Analysis');

-- Google Business Profile Audit → GBP Optimisation, Review Management
insert into objective_template_tasks (template_id, task_id, sort_order)
select t.id, tl.id, row_number() over (order by tl.sort_order)
from objective_templates t
cross join task_library tl
where t.title = 'Google Business Profile Audit'
  and tl.name in ('Google Business Profile Optimisation', 'Review Management Strategy');

-- Analytics & Reporting Setup → GSC Analysis, Analytics Review
insert into objective_template_tasks (template_id, task_id, sort_order)
select t.id, tl.id, row_number() over (order by tl.sort_order)
from objective_templates t
cross join task_library tl
where t.title = 'Analytics & Reporting Setup'
  and tl.name in ('Google Search Console Analysis', 'Analytics Review & Insights');

-- Site Speed & Performance → Core Web Vitals Audit, Page Speed Optimisation, Image Optimisation
insert into objective_template_tasks (template_id, task_id, sort_order)
select t.id, tl.id, row_number() over (order by tl.sort_order)
from objective_templates t
cross join task_library tl
where t.title = 'Site Speed & Performance'
  and tl.name in ('Core Web Vitals Audit', 'Page Speed Optimisation', 'Image Optimisation');

-- Competitor Analysis & Benchmarking → Competitor Analysis, SERP Feature Analysis, Keyword Research
insert into objective_template_tasks (template_id, task_id, sort_order)
select t.id, tl.id, row_number() over (order by tl.sort_order)
from objective_templates t
cross join task_library tl
where t.title = 'Competitor Analysis & Benchmarking'
  and tl.name in ('Competitor Analysis', 'SERP Feature Analysis', 'Keyword Research');

-- Landing Page Optimisation → Landing Page Optimisation, On-Page SEO Audit, Content Review
insert into objective_template_tasks (template_id, task_id, sort_order)
select t.id, tl.id, row_number() over (order by tl.sort_order)
from objective_templates t
cross join task_library tl
where t.title = 'Landing Page Optimisation'
  and tl.name in ('Landing Page Optimisation', 'On-Page SEO Audit', 'Content Review & Optimisation');


-- ─── Sample OKR data for Acme Construction ────────────────────────
-- Insert a period for the first client (Acme Construction)
insert into okr_periods (client_id, start_month, start_year, end_month, end_year, goal, is_published, offsite_allowance_percent)
select c.id, 1, 2026, 3, 2026,
  'Increase organic traffic by 30% and improve local SEO rankings',
  false, 5
from clients c where c.abbreviation = 'ACM';

-- Objective 1: Technical Website Optimisations
insert into okr_objectives (period_id, title, scope, sort_order)
select p.id, 'Technical Website Optimisations', 'sitewide', 1
from okr_periods p
join clients c on c.id = p.client_id
where c.abbreviation = 'ACM' and p.start_month = 1 and p.start_year = 2026;

-- Key results for Technical objective
insert into okr_key_results (objective_id, task, description, am_hours, seo_hours, status, sort_order)
select o.id, t.task, t.description, t.am_hours, t.seo_hours, t.status, t.sort_order
from okr_objectives o
join okr_periods p on p.id = o.period_id
join clients c on c.id = p.client_id
cross join (values
  ('Technical Site Audit', 'Run Screaming Frog crawl & document all issues', 0.5, 3.5, 'complete', 1),
  ('Schema Markup Implementation', 'Add LocalBusiness and FAQPage schema', 0, 3, 'pending', 2),
  ('Core Web Vitals Audit', 'Audit and fix LCP, FID, CLS issues', 0, 3, 'pending', 3)
) as t(task, description, am_hours, seo_hours, status, sort_order)
where c.abbreviation = 'ACM' and o.title = 'Technical Website Optimisations';

-- Objective 2: Local SEO & Google Business Profile
insert into okr_objectives (period_id, title, scope, sort_order)
select p.id, 'Local SEO & Google Business Profile', 'sitewide', 2
from okr_periods p
join clients c on c.id = p.client_id
where c.abbreviation = 'ACM' and p.start_month = 1 and p.start_year = 2026;

-- Key results for Local SEO objective
insert into okr_key_results (objective_id, task, description, am_hours, seo_hours, status, sort_order)
select o.id, t.task, t.description, t.am_hours, t.seo_hours, t.status, t.sort_order
from okr_objectives o
join okr_periods p on p.id = o.period_id
join clients c on c.id = p.client_id
cross join (values
  ('Google Business Profile Optimisation', 'Full GBP audit and optimisation', 0.5, 2, 'complete', 1),
  ('Local Citation Building', 'Build 15 local citations across key directories', 0, 3, 'pending', 2),
  ('Review Management Strategy', 'Set up review generation workflow', 1, 1, 'pending', 3)
) as t(task, description, am_hours, seo_hours, status, sort_order)
where c.abbreviation = 'ACM' and o.title = 'Local SEO & Google Business Profile';


-- ─── Sample OKR data for Swan River Brewing ───────────────────────
insert into okr_periods (client_id, start_month, start_year, end_month, end_year, goal, is_published, offsite_allowance_percent)
select c.id, 1, 2026, 3, 2026,
  'Launch new eCommerce store and drive initial traffic',
  true, 5
from clients c where c.abbreviation = 'SRB';

-- Objective: Keyword Research & Strategy
insert into okr_objectives (period_id, title, scope, sort_order)
select p.id, 'Keyword Research & Strategy', 'sitewide', 1
from okr_periods p
join clients c on c.id = p.client_id
where c.abbreviation = 'SRB' and p.start_month = 1 and p.start_year = 2026;

-- Key results
insert into okr_key_results (objective_id, task, description, am_hours, seo_hours, status, sort_order)
select o.id, t.task, t.description, t.am_hours, t.seo_hours, t.status, t.sort_order
from okr_objectives o
join okr_periods p on p.id = o.period_id
join clients c on c.id = p.client_id
cross join (values
  ('Keyword Research', 'Full keyword research for eCommerce categories', 0.5, 3.5, 'complete', 1),
  ('Keyword Mapping', 'Map keywords to product and category pages', 0, 2, 'pending', 2)
) as t(task, description, am_hours, seo_hours, status, sort_order)
where c.abbreviation = 'SRB' and o.title = 'Keyword Research & Strategy';
