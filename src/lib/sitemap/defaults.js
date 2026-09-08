// Seed data for a new sitemap: page templates and WordPress menus.
// These are starting points only. Everything is editable per client.

export const DEFAULT_MENUS = [
  'Primary Navigation',
  'Footer Navigation',
  'Controls Navigation',
  'Legal Navigation',
  'Above Primary Navigation',
]

export const REVIEW_CADENCES = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannual', label: 'Biannual' },
  { value: 'annual', label: 'Annual' },
]

// blocks: rows of wireframe blocks. c = 'hero' | 'tall' | 'cta' | undefined
export const DEFAULT_PAGE_TEMPLATES = [
  {
    code: 'T1', name: 'Home',
    description: 'Full-width entry point. Hero with primary keyword H1, service grid, trust strip, featured results, contact CTA.',
    blocks: [
      [{ t: 'Hero — H1 + primary CTA', c: 'hero' }],
      [{ t: 'Service grid', c: 'tall' }],
      [{ t: 'Trust strip / awards' }],
      [{ t: 'Featured results' }, { t: 'About teaser' }],
      [{ t: 'Contact CTA', c: 'cta' }],
    ],
  },
  {
    code: 'T2', name: 'Service Parent',
    description: 'Hub page for a service area. Introduces the area, links down to child services, answers common questions.',
    blocks: [
      [{ t: 'Hero — H1 + breadcrumb', c: 'hero' }],
      [{ t: 'Intro copy' }, { t: 'Quick contact' }],
      [{ t: 'Child service links', c: 'tall' }],
      [{ t: 'FAQ accordion' }],
      [{ t: 'Consult CTA', c: 'cta' }],
    ],
  },
  {
    code: 'T3', name: 'Service Child',
    description: 'Conversion-focused single service page. Long-form content sections against a persistent contact sidebar.',
    blocks: [
      [{ t: 'Hero — H1 + breadcrumb', c: 'hero' }],
      [{ t: 'Content sections', c: 'tall' }, { t: 'Sticky contact card', c: 'tall' }],
      [{ t: 'Process steps' }],
      [{ t: 'FAQ' }],
      [{ t: 'Consult CTA', c: 'cta' }],
    ],
  },
  {
    code: 'T4', name: 'Standard Internal',
    description: 'Simple flexible content page for about, values, policies and general information.',
    blocks: [
      [{ t: 'Page header', c: 'hero' }],
      [{ t: 'Flexible content blocks', c: 'tall' }],
      [{ t: 'Related links' }],
    ],
  },
  {
    code: 'T5', name: 'Team',
    description: 'People listing with individual profiles. Each profile links to its service areas for internal linking.',
    blocks: [
      [{ t: 'Page header', c: 'hero' }],
      [{ t: 'Person' }, { t: 'Person' }, { t: 'Person' }],
      [{ t: 'Person' }, { t: 'Person' }, { t: 'Person' }],
      [{ t: 'Join us CTA', c: 'cta' }],
    ],
  },
  {
    code: 'T6', name: 'Contact',
    description: 'Short enquiry form beside office details and map. Minimal distractions.',
    blocks: [
      [{ t: 'Page header', c: 'hero' }],
      [{ t: 'Enquiry form', c: 'tall' }, { t: 'Office details + map', c: 'tall' }],
    ],
  },
]

export const DEFAULT_PLAN_VERSION_NAME = 'SEO Foundations'

/** Page → menus fallback when a page has no explicit menu_names. */
export const DEFAULT_MENU_ASSIGNMENT = {
  top: ['Primary Navigation', 'Footer Navigation'],
  child: ['Primary Navigation'],
  functional: ['Footer Navigation'],
}

/** Pick the default template for a page based on its position/status. */
export function defaultTemplateFor({ isHomePage, depth, status }, templates) {
  const byName = name => templates.find(t => t.name.toLowerCase() === name.toLowerCase())
  if (isHomePage) return byName('Home') || templates[0] || null
  if (status === 'functional') return byName('Standard Internal') || templates[0] || null
  if (depth <= 1) return byName('Service Parent') || templates[0] || null
  return byName('Service Child') || templates[0] || null
}
