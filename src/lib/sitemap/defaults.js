import { s } from './templateBlocks.js'

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

// blocks: page outline sections, see lib/sitemap/templateBlocks.js
export const DEFAULT_PAGE_TEMPLATES = [
  {
    code: 'T1', name: 'Home',
    description: 'Full-width entry point. Hero with primary keyword H1, service overview, trust, featured work, contact CTA.',
    blocks: [
      s('Nav bar', 'Mega menu'),
      s('Hero Banner', 'Hero image or video with H1 and subheading.\nCTA → \'Get in touch\'', '15-25'),
      s('Services', 'Service overview, one card per hub with an image\n- {Main categories}', '40-60'),
      s('Trust strip', 'Awards, accreditations or client logos.'),
      s('About teaser', 'Short story about the business.\n- Team photo\nCTA → \'About us\''),
      s('Featured work', 'Three latest articles or projects.\nCTA → \'View all\''),
      s('Contact CTA', 'Closing prompt to enquire.\nCTA → \'Book a consultation\''),
      s('Footer'),
    ],
  },
  {
    code: 'T2', name: 'Service Parent',
    description: 'Hub page for a service area. Introduces the area, links down to child services, answers common questions.',
    blocks: [
      s('Nav bar'),
      s('Page Header', 'Clear category intro.\nCTA → \'Book a consultation\''),
      s('Breadcrumbs'),
      s('Explore {Page title}', 'Links to each child service with image and one line.\n- {Child pages}', '40-80'),
      s('Choosing with confidence', 'Why choose us, in three short points.'),
      s('FAQ', 'Category-level accordion for long-tail SEO.', '200-300'),
      s('CTA Section'),
      s('Footer'),
    ],
  },
  {
    code: 'T3', name: 'Service Child',
    description: 'Conversion-focused single service page. Long-form content against a persistent contact card.',
    blocks: [
      s('Nav bar'),
      s('Page Header', 'Service intro.\nCTA → \'Enquire now\''),
      s('Breadcrumbs'),
      s('Overview', 'Short intro with three benefit ticks.', '80-120'),
      s('Gallery', 'Recent projects for this service.'),
      s('Process', 'Steps from enquiry to finished job.\n- Consult\n- Plan\n- Deliver'),
      s('FAQ', 'Service-level accordion for long-tail SEO.', '200-300'),
      s('Related services', 'Sibling services, for internal linking.\n- {Sibling pages}'),
      s('CTA Section'),
      s('Footer'),
    ],
  },
  {
    code: 'T4', name: 'Standard Internal',
    description: 'Simple flexible content page for about, values, policies and general information.',
    blocks: [
      s('Nav bar'),
      s('Page Header'),
      s('Breadcrumbs'),
      s('Our story', 'Split layout with image and narrative.'),
      s('Content', 'Flexible content blocks.'),
      s('CTA Section'),
      s('Footer'),
    ],
  },
  {
    code: 'T5', name: 'Team',
    description: 'People listing with individual profiles. Each profile links to its service areas for internal linking.',
    blocks: [
      s('Nav bar'),
      s('Page Header'),
      s('Team', 'Grid of people.\n- Photo, name, role\n- Links to their service areas'),
      s('Join us', 'CTA → \'View careers\''),
      s('Footer'),
    ],
  },
  {
    code: 'T6', name: 'Contact',
    description: 'Short enquiry form beside office details and map. Minimal distractions.',
    blocks: [
      s('Nav bar'),
      s('Page Header', "CTA → 'Call us'"),
      s('Enquiry form', '- Name\n- Email\n- Phone\n- Message'),
      s('Map and office details', 'Office address, hours and directions.'),
      s('FAQ', 'Handle the last objections before enquiring.'),
      s('Footer'),
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
