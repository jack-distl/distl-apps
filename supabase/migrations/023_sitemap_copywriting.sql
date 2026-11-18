-- Sitemap Tool: template tree and copywriting.
--
-- 1. sitemap_page_templates.parent_template_id: where a template sits in the
--    Templates tree. Null means "work it out from the pages using it".
-- 2. sitemap_pages.copy_confirmed: the Copywriting tab's tick once a page's
--    copy is signed off.
-- 3. sitemap_page_copy: the copy for one section of one page's template,
--    keyed by the template section's id (blocks[].id).
-- Safe to run more than once.

alter table sitemap_page_templates
  add column if not exists parent_template_id uuid references sitemap_page_templates(id) on delete set null;

alter table sitemap_pages
  add column if not exists copy_confirmed boolean not null default false;

create table if not exists sitemap_page_copy (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references sitemap_pages(id) on delete cascade,
  section_id text not null,
  body text not null default '',
  updated_at timestamptz not null default now(),
  unique (page_id, section_id)
);

create index if not exists idx_sitemap_page_copy_page on sitemap_page_copy(page_id);

alter table sitemap_page_copy enable row level security;

drop policy if exists "Authenticated users can read sitemap_page_copy" on sitemap_page_copy;
create policy "Authenticated users can read sitemap_page_copy"
  on sitemap_page_copy for select to authenticated using (true);
drop policy if exists "Authenticated users can manage sitemap_page_copy" on sitemap_page_copy;
create policy "Authenticated users can manage sitemap_page_copy"
  on sitemap_page_copy for all to authenticated using (true) with check (true);
