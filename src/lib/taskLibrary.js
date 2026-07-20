// Task Library — Distl SEO retainer standard tasks / OKRs.
// This is the dev / no-Supabase fallback. The live library is stored in
// Supabase (task_library / objective_templates / objective_template_tasks)
// and seeded by supabase/migrations/014_reseed_task_library.sql — keep the two in sync.
export const TASK_LIBRARY = [
  { id: 'task-00-keyword-research-discovery-valid', name: 'Keyword Research & Discovery / Validation', defaultAmHours: 0, defaultSeoHours: 0.5 },
  { id: 'task-01-content-optimisation-expansion-m', name: 'Content Optimisation & Expansion (meta, titles, headings, new content)', defaultAmHours: 0, defaultSeoHours: 4.5 },
  { id: 'task-02-client-content-approval-revision', name: 'Client Content Approval & Revisions', defaultAmHours: 1, defaultSeoHours: 0 },
  { id: 'task-03-implement-content-design-if-appl', name: 'Implement Content (& design if applicable)', defaultAmHours: 0, defaultSeoHours: 1 },
  { id: 'task-04-expand-product-services-section', name: 'Expand Product / Services Section & internal links', defaultAmHours: 0, defaultSeoHours: 1 },
  { id: 'task-05-publish-index', name: 'Publish & Index', defaultAmHours: 0, defaultSeoHours: 0.5 },
  { id: 'task-06-keyword-research-discovery-new-o', name: 'Keyword Research & Discovery (new opportunity)', defaultAmHours: 0, defaultSeoHours: 0.5 },
  { id: 'task-07-write-new-content-seo-optimise-t', name: 'Write New Content & SEO Optimise (titles / metas / URL)', defaultAmHours: 0, defaultSeoHours: 4.5 },
  { id: 'task-08-content-approval-client-revision', name: 'Content Approval & Client Revisions', defaultAmHours: 1, defaultSeoHours: 0 },
  { id: 'task-09-draft-implement-content-design-o', name: 'Draft / Implement Content & Design on website', defaultAmHours: 0, defaultSeoHours: 1 },
  { id: 'task-10-blog-topic-research-ideas-title', name: 'Blog Topic Research & Ideas (title / angle / purpose)', defaultAmHours: 0, defaultSeoHours: 1 },
  { id: 'task-11-blog-strategy-content-briefs-per', name: 'Blog Strategy & Content Briefs (per blog)', defaultAmHours: 0.5, defaultSeoHours: 2 },
  { id: 'task-12-copywriting-draft-blog-incl-meta', name: 'Copywriting / Draft Blog (incl. meta, headings, internal linking)', defaultAmHours: 0, defaultSeoHours: 2.5 },
  { id: 'task-13-blog-review-feedback-client-appr', name: 'Blog Review & Feedback / Client Approval', defaultAmHours: 1, defaultSeoHours: 0 },
  { id: 'task-14-optimise-publish-index', name: 'Optimise, Publish & Index', defaultAmHours: 0, defaultSeoHours: 1.5 },
  { id: 'task-15-audit-overlapping-pages-plan-str', name: 'Audit overlapping pages & plan strategy', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-16-de-optimise-re-optimise-competin', name: 'De-optimise / re-optimise competing pages', defaultAmHours: 0, defaultSeoHours: 3 },
  { id: 'task-17-internal-linking-to-clarify-the', name: 'Internal linking to clarify the preferred (canonical) page', defaultAmHours: 0, defaultSeoHours: 1.5 },
  { id: 'task-18-consolidate-duplicate-pages-impl', name: 'Consolidate duplicate pages & implement redirects', defaultAmHours: 0, defaultSeoHours: 3 },
  { id: 'task-19-team-member-bio-page-creation', name: 'Team member bio page creation', defaultAmHours: 0.5, defaultSeoHours: 3.5 },
  { id: 'task-20-profilepage-schema-setup-impleme', name: 'ProfilePage schema setup & implementation', defaultAmHours: 0, defaultSeoHours: 4 },
  { id: 'task-21-review-schema-pull-from-gbp-revi', name: 'Review schema (pull from GBP reviews)', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-22-technical-audit-priority-placeho', name: 'Technical Audit (priority placeholder, e.g. sitemap changes)', defaultAmHours: 0, defaultSeoHours: 3.5 },
  { id: 'task-23-audit-site-for-404s-redirects-wr', name: 'Audit Site for 404s & Redirects - write report', defaultAmHours: 0, defaultSeoHours: 4 },
  { id: 'task-24-resolve-issues-on-key-pages', name: 'Resolve issues on key pages', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-25-set-up-redirects', name: 'Set up redirects', defaultAmHours: 0, defaultSeoHours: 0.5 },
  { id: 'task-26-fix-internal-site-health-issues', name: 'Fix internal site health issues (301s, HTTPS, sitemap)', defaultAmHours: 0, defaultSeoHours: 1 },
  { id: 'task-27-schema-implementation-faq-localb', name: 'Schema implementation (FAQ / LocalBusiness / ProfilePage / ItemList / Review)', defaultAmHours: 0, defaultSeoHours: 3.5 },
  { id: 'task-28-correct-outdated-info-across-sit', name: 'Correct outdated info across site (pricing, meta data)', defaultAmHours: 0, defaultSeoHours: 1.5 },
  { id: 'task-29-gbp-optimisation-products-servic', name: 'GBP optimisation - products / services content', defaultAmHours: 0, defaultSeoHours: 4 },
  { id: 'task-30-gbp-write-new-seo-content-servic', name: 'GBP - write new SEO content (services / products)', defaultAmHours: 0, defaultSeoHours: 3 },
  { id: 'task-31-gbp-implement-content-image-link', name: 'GBP - implement content, image & links', defaultAmHours: 0, defaultSeoHours: 2.5 },
  { id: 'task-32-gbp-live-posts', name: 'GBP Live Posts', defaultAmHours: 0, defaultSeoHours: 4 },
  { id: 'task-33-citation-building-nap-cleanup-ac', name: 'Citation building / NAP cleanup across directories', defaultAmHours: 0, defaultSeoHours: 2.5 },
  { id: 'task-34-link-prospecting', name: 'Link Prospecting', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-35-outreach-draft-request', name: 'Outreach / Draft Request', defaultAmHours: 0, defaultSeoHours: 1 },
  { id: 'task-36-find-suitable-link-purchase', name: 'Find suitable link & purchase', defaultAmHours: 0, defaultSeoHours: 0.5 },
  { id: 'task-37-link-placement-publication', name: 'Link Placement / Publication', defaultAmHours: 0, defaultSeoHours: 1 },
  { id: 'task-38-send-link-to-am-report', name: 'Send link to AM / report', defaultAmHours: 0.5, defaultSeoHours: 0 },
  { id: 'task-39-citations-prepare-info-order-pro', name: 'Citations (prepare info + order + provide spreadsheet)', defaultAmHours: 0, defaultSeoHours: 3 },
  { id: 'task-40-receive-pr-materials-brief-from', name: 'Receive PR materials / brief from client', defaultAmHours: 0.5, defaultSeoHours: 0 },
  { id: 'task-41-draft-pr-long-form', name: 'Draft PR - long form', defaultAmHours: 0, defaultSeoHours: 3 },
  { id: 'task-42-draft-pr-short-form', name: 'Draft PR - short form', defaultAmHours: 0, defaultSeoHours: 1 },
  { id: 'task-43-draft-approval', name: 'Draft approval', defaultAmHours: 1, defaultSeoHours: 0 },
  { id: 'task-44-application-purchase-process', name: 'Application / purchase process', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-45-publish-syndicate-gbp-post-index', name: 'Publish & syndicate (GBP post + index in GSC)', defaultAmHours: 0, defaultSeoHours: 1.5 },
  { id: 'task-46-repurpose-for-blog-post', name: 'Repurpose for blog post', defaultAmHours: 0, defaultSeoHours: 4 },
  { id: 'task-47-audit-form-ux-identify-friction', name: 'Audit form UX & identify friction points', defaultAmHours: 0, defaultSeoHours: 0.5 },
  { id: 'task-48-research-form-platform-capabilit', name: 'Research form platform capabilities / options', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-49-implement-form-improvements', name: 'Implement form improvements', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-50-test-validate-functionality', name: 'Test & validate functionality', defaultAmHours: 0, defaultSeoHours: 1 },
  { id: 'task-51-onsite-conversion-tracking-setup', name: 'Onsite conversion tracking setup (incl. live chat / LCM)', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-52-check-geo-retainer-eligibility', name: 'Check GEO retainer eligibility', defaultAmHours: 0.5, defaultSeoHours: 0.5 },
  { id: 'task-53-longtail-heading-optimisations-f', name: 'Longtail & heading optimisations for AIO (AI overviews)', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-54-starter-inception-meeting', name: 'Starter / Inception Meeting', defaultAmHours: 0.5, defaultSeoHours: 0.5 },
  { id: 'task-55-business-information-for-citatio', name: 'Business Information for Citations', defaultAmHours: 0, defaultSeoHours: 1 },
  { id: 'task-56-google-analytics-setup', name: 'Google Analytics Setup', defaultAmHours: 0, defaultSeoHours: 1 },
  { id: 'task-57-google-tag-manager-setup', name: 'Google Tag Manager Setup', defaultAmHours: 0, defaultSeoHours: 1 },
  { id: 'task-58-google-search-console-setup', name: 'Google Search Console Setup', defaultAmHours: 0, defaultSeoHours: 0.5 },
  { id: 'task-59-agency-analytics-setup', name: 'Agency Analytics Setup', defaultAmHours: 0, defaultSeoHours: 0.5 },
  { id: 'task-60-se-ranking-setup', name: 'SE Ranking Setup', defaultAmHours: 0, defaultSeoHours: 0.5 },
  { id: 'task-61-keyword-research', name: 'Keyword Research', defaultAmHours: 0, defaultSeoHours: 4 },
  { id: 'task-62-sitemap-development', name: 'Sitemap Development', defaultAmHours: 0, defaultSeoHours: 3 },
  { id: 'task-63-meta-data-review-development', name: 'Meta Data Review & Development', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-64-technical-audit', name: 'Technical Audit', defaultAmHours: 0, defaultSeoHours: 4 },
  { id: 'task-65-baseline-metrics-audit-findings', name: 'Baseline Metrics & Audit Findings Report', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-66-quarterly-okr-report', name: 'Quarterly OKR Report', defaultAmHours: 2.5, defaultSeoHours: 5 },
  { id: 'task-67-review-results-and-plan-upcoming', name: 'Review Results and Plan Upcoming OKRs', defaultAmHours: 1, defaultSeoHours: 5 },
  { id: 'task-68-monthly-reporting', name: 'Monthly Reporting', defaultAmHours: 2.5, defaultSeoHours: 5 },
]

// Template categories (display order)
export const TEMPLATE_CATEGORIES = [
  'Content & On-Page',
  'Technical SEO',
  'Local SEO',
  'Off-site / Authority',
  'Conversion & Tracking',
  'Emerging / AI',
  'Onboarding',
  'Reporting & Planning',
]

// Objective Templates — predefined objectives with pre-configured tasks
export const OBJECTIVE_TEMPLATES = [
  {
    id: 'tpl-content-optimisation-expansion-e',
    title: 'Content Optimisation & Expansion (Existing Page)',
    category: 'Content & On-Page',
    defaultScope: 'specific-pages',
    tasks: ['task-00-keyword-research-discovery-valid', 'task-01-content-optimisation-expansion-m', 'task-02-client-content-approval-revision', 'task-03-implement-content-design-if-appl', 'task-04-expand-product-services-section', 'task-05-publish-index'],
  },
  {
    id: 'tpl-new-seo-landing-page-creation',
    title: 'New SEO Landing Page Creation',
    category: 'Content & On-Page',
    defaultScope: 'specific-pages',
    tasks: ['task-06-keyword-research-discovery-new-o', 'task-07-write-new-content-seo-optimise-t', 'task-08-content-approval-client-revision', 'task-09-draft-implement-content-design-o', 'task-05-publish-index'],
  },
  {
    id: 'tpl-blog-content-build-topical-autho',
    title: 'Blog Content / Build Topical Authority',
    category: 'Content & On-Page',
    defaultScope: 'sitewide',
    tasks: ['task-10-blog-topic-research-ideas-title', 'task-11-blog-strategy-content-briefs-per', 'task-12-copywriting-draft-blog-incl-meta', 'task-13-blog-review-feedback-client-appr', 'task-14-optimise-publish-index'],
  },
  {
    id: 'tpl-keyword-cannibalisation-consolid',
    title: 'Keyword Cannibalisation / Consolidation',
    category: 'Content & On-Page',
    defaultScope: 'specific-pages',
    tasks: ['task-15-audit-overlapping-pages-plan-str', 'task-16-de-optimise-re-optimise-competin', 'task-17-internal-linking-to-clarify-the', 'task-18-consolidate-duplicate-pages-impl'],
  },
  {
    id: 'tpl-eeat-optimisation',
    title: 'EEAT Optimisation',
    category: 'Content & On-Page',
    defaultScope: 'sitewide',
    tasks: ['task-19-team-member-bio-page-creation', 'task-20-profilepage-schema-setup-impleme', 'task-21-review-schema-pull-from-gbp-revi'],
  },
  {
    id: 'tpl-technical-seo',
    title: 'Technical SEO',
    category: 'Technical SEO',
    defaultScope: 'sitewide',
    tasks: ['task-22-technical-audit-priority-placeho', 'task-23-audit-site-for-404s-redirects-wr', 'task-24-resolve-issues-on-key-pages', 'task-25-set-up-redirects', 'task-26-fix-internal-site-health-issues', 'task-27-schema-implementation-faq-localb', 'task-28-correct-outdated-info-across-sit'],
  },
  {
    id: 'tpl-local-seo',
    title: 'Local SEO',
    category: 'Local SEO',
    defaultScope: 'sitewide',
    tasks: ['task-29-gbp-optimisation-products-servic', 'task-30-gbp-write-new-seo-content-servic', 'task-31-gbp-implement-content-image-link', 'task-32-gbp-live-posts', 'task-33-citation-building-nap-cleanup-ac'],
  },
  {
    id: 'tpl-off-site-link-building',
    title: 'Off-site / Link Building',
    category: 'Off-site / Authority',
    defaultScope: 'sitewide',
    tasks: ['task-34-link-prospecting', 'task-35-outreach-draft-request', 'task-36-find-suitable-link-purchase', 'task-37-link-placement-publication', 'task-38-send-link-to-am-report', 'task-39-citations-prepare-info-order-pro'],
  },
  {
    id: 'tpl-digital-pr-brand-awareness',
    title: 'Digital PR / Brand Awareness',
    category: 'Off-site / Authority',
    defaultScope: 'sitewide',
    tasks: ['task-40-receive-pr-materials-brief-from', 'task-41-draft-pr-long-form', 'task-42-draft-pr-short-form', 'task-43-draft-approval', 'task-44-application-purchase-process', 'task-45-publish-syndicate-gbp-post-index', 'task-46-repurpose-for-blog-post'],
  },
  {
    id: 'tpl-conversion-rate-optimisation',
    title: 'Conversion Rate Optimisation',
    category: 'Conversion & Tracking',
    defaultScope: 'specific-pages',
    tasks: ['task-47-audit-form-ux-identify-friction', 'task-48-research-form-platform-capabilit', 'task-49-implement-form-improvements', 'task-50-test-validate-functionality', 'task-51-onsite-conversion-tracking-setup'],
  },
  {
    id: 'tpl-geo-ai-optimisation',
    title: 'GEO / AI Optimisation',
    category: 'Emerging / AI',
    defaultScope: 'sitewide',
    tasks: ['task-52-check-geo-retainer-eligibility', 'task-53-longtail-heading-optimisations-f'],
  },
  {
    id: 'tpl-seo-foundations-new-client-onboa',
    title: 'SEO Foundations - New Client Onboarding',
    category: 'Onboarding',
    defaultScope: 'sitewide',
    tasks: ['task-54-starter-inception-meeting', 'task-55-business-information-for-citatio', 'task-56-google-analytics-setup', 'task-57-google-tag-manager-setup', 'task-58-google-search-console-setup', 'task-59-agency-analytics-setup', 'task-60-se-ranking-setup', 'task-61-keyword-research', 'task-62-sitemap-development', 'task-63-meta-data-review-development', 'task-64-technical-audit', 'task-65-baseline-metrics-audit-findings'],
  },
  {
    id: 'tpl-reporting-and-planning',
    title: 'Reporting and Planning',
    category: 'Reporting & Planning',
    defaultScope: 'sitewide',
    tasks: ['task-66-quarterly-okr-report', 'task-67-review-results-and-plan-upcoming', 'task-68-monthly-reporting'],
  },
]

// Scope options
export const SCOPE_OPTIONS = [
  { id: 'sitewide', label: 'Sitewide', color: 'bg-blue-100 text-blue-700' },
  { id: 'specific-pages', label: 'Specific Page(s)', color: 'bg-amber-100 text-amber-700' },
  { id: 'keyword-group', label: 'Keyword Group', color: 'bg-purple-100 text-purple-700' },
]

// Helper: get template with resolved tasks (includes default hours from task library)
export function resolveTemplate(templateId) {
  const template = OBJECTIVE_TEMPLATES.find(t => t.id === templateId)
  if (!template) return null

  const resolvedTasks = template.tasks
    .map(taskId => TASK_LIBRARY.find(t => t.id === taskId))
    .filter(Boolean)

  const totalHours = resolvedTasks.reduce(
    (sum, t) => sum + t.defaultAmHours + t.defaultSeoHours,
    0
  )

  return { ...template, resolvedTasks, totalHours, taskCount: resolvedTasks.length }
}

// Helper: get all templates with resolved data (for template selector modal)
export function getAllTemplatesResolved() {
  return OBJECTIVE_TEMPLATES.map(t => resolveTemplate(t.id))
}
