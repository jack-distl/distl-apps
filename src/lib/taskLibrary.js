// Task Library — 25 predefined SEO/AM task types with default hours
export const TASK_LIBRARY = [
  { id: 'task-keyword-research', name: 'Keyword Research', defaultAmHours: 0.5, defaultSeoHours: 3.5 },
  { id: 'task-keyword-mapping', name: 'Keyword Mapping', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-onpage-audit', name: 'On-Page SEO Audit', defaultAmHours: 0.5, defaultSeoHours: 3 },
  { id: 'task-title-meta', name: 'Title Tag & Meta Description Optimisation', defaultAmHours: 0, defaultSeoHours: 2.5 },
  { id: 'task-internal-linking', name: 'Internal Linking Improvements', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-content-gap', name: 'Content Gap Analysis', defaultAmHours: 0.5, defaultSeoHours: 2.5 },
  { id: 'task-content-brief', name: 'Content Brief Creation', defaultAmHours: 1, defaultSeoHours: 2 },
  { id: 'task-content-review', name: 'Content Review & Optimisation', defaultAmHours: 0.5, defaultSeoHours: 2 },
  { id: 'task-technical-audit', name: 'Technical Site Audit', defaultAmHours: 0.5, defaultSeoHours: 3.5 },
  { id: 'task-cwv-audit', name: 'Core Web Vitals Audit', defaultAmHours: 0, defaultSeoHours: 3 },
  { id: 'task-schema', name: 'Schema Markup Implementation', defaultAmHours: 0, defaultSeoHours: 3 },
  { id: 'task-sitemap-robots', name: 'Sitemap & Robots.txt Review', defaultAmHours: 0, defaultSeoHours: 1 },
  { id: 'task-url-redirects', name: 'URL Structure & Redirect Audit', defaultAmHours: 0, defaultSeoHours: 2.5 },
  { id: 'task-image-opt', name: 'Image Optimisation', defaultAmHours: 0, defaultSeoHours: 2 },
  { id: 'task-gbp-opt', name: 'Google Business Profile Optimisation', defaultAmHours: 0.5, defaultSeoHours: 2 },
  { id: 'task-citations', name: 'Local Citation Building', defaultAmHours: 0, defaultSeoHours: 3 },
  { id: 'task-review-mgmt', name: 'Review Management Strategy', defaultAmHours: 1, defaultSeoHours: 1 },
  { id: 'task-backlink-audit', name: 'Backlink Audit', defaultAmHours: 0, defaultSeoHours: 3 },
  { id: 'task-link-outreach', name: 'Link Building Outreach', defaultAmHours: 0.5, defaultSeoHours: 3.5 },
  { id: 'task-competitor', name: 'Competitor Analysis', defaultAmHours: 0.5, defaultSeoHours: 3 },
  { id: 'task-gsc-analysis', name: 'Google Search Console Analysis', defaultAmHours: 0.5, defaultSeoHours: 2 },
  { id: 'task-analytics', name: 'Analytics Review & Insights', defaultAmHours: 1, defaultSeoHours: 2 },
  { id: 'task-landing-page', name: 'Landing Page Optimisation', defaultAmHours: 0.5, defaultSeoHours: 2.5 },
  { id: 'task-page-speed', name: 'Page Speed Optimisation', defaultAmHours: 0, defaultSeoHours: 3 },
  { id: 'task-serp-features', name: 'SERP Feature Analysis', defaultAmHours: 0.5, defaultSeoHours: 2 },
]

// Objective Templates — 11 predefined objectives with pre-configured key results
export const OBJECTIVE_TEMPLATES = [
  {
    id: 'tpl-technical',
    title: 'Technical Website Optimisations',
    defaultScope: 'sitewide',
    tasks: ['task-technical-audit', 'task-cwv-audit', 'task-schema', 'task-sitemap-robots', 'task-url-redirects'],
  },
  {
    id: 'tpl-onpage',
    title: 'On-Page SEO Optimisation',
    defaultScope: 'specific-pages',
    tasks: ['task-onpage-audit', 'task-title-meta', 'task-internal-linking', 'task-image-opt'],
  },
  {
    id: 'tpl-content',
    title: 'Content Strategy & Creation',
    defaultScope: 'sitewide',
    tasks: ['task-content-gap', 'task-content-brief', 'task-content-review'],
  },
  {
    id: 'tpl-local-seo',
    title: 'Local SEO & Google Business Profile',
    defaultScope: 'sitewide',
    tasks: ['task-gbp-opt', 'task-citations', 'task-review-mgmt'],
  },
  {
    id: 'tpl-keyword',
    title: 'Keyword Research & Strategy',
    defaultScope: 'sitewide',
    tasks: ['task-keyword-research', 'task-keyword-mapping', 'task-serp-features'],
  },
  {
    id: 'tpl-link-building',
    title: 'Link Building & Authority',
    defaultScope: 'sitewide',
    tasks: ['task-backlink-audit', 'task-link-outreach', 'task-competitor'],
  },
  {
    id: 'tpl-gbp-audit',
    title: 'Google Business Profile Audit',
    defaultScope: 'sitewide',
    tasks: ['task-gbp-opt', 'task-review-mgmt'],
  },
  {
    id: 'tpl-analytics',
    title: 'Analytics & Reporting Setup',
    defaultScope: 'sitewide',
    tasks: ['task-gsc-analysis', 'task-analytics'],
  },
  {
    id: 'tpl-performance',
    title: 'Site Speed & Performance',
    defaultScope: 'sitewide',
    tasks: ['task-cwv-audit', 'task-page-speed', 'task-image-opt'],
  },
  {
    id: 'tpl-competitor',
    title: 'Competitor Analysis & Benchmarking',
    defaultScope: 'sitewide',
    tasks: ['task-competitor', 'task-serp-features', 'task-keyword-research'],
  },
  {
    id: 'tpl-landing-page',
    title: 'Landing Page Optimisation',
    defaultScope: 'specific-pages',
    tasks: ['task-landing-page', 'task-onpage-audit', 'task-content-review'],
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
