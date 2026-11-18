import { section } from './templateBlocks.js'

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

// blocks: page outline rows, see lib/sitemap/templateBlocks.js
const two = (a, b) => ({ cols: [...section(...a).cols, ...section(...b).cols] })

export const DEFAULT_PAGE_TEMPLATES = [
  {
    code: 'T1', name: 'Home',
    description: 'Full-width entry point. Hero with primary keyword H1, service overview, trust, featured work, contact CTA.',
    blocks: [
      section('navigation', 'Mega menu'),
      section('hero', 'Hero image or video with H1 and subheading.\nCTA → \'Get in touch\'', { color: 'dark' }),
      section('feature-list', 'Service overview\n- One card per parent service\n- Each card has an image and links down', { title: 'Services' }),
      section('logos', 'Awards, accreditations or client logos.', { title: 'Trust strip' }),
      section('text-image', 'Short story about the business.\n- Team photo\nCTA → \'About us\'', { title: 'About teaser' }),
      section('posts', 'Three latest articles or projects.\nCTA → \'View all\'', { title: 'Featured work' }),
      section('cta', 'Closing prompt to enquire.\nCTA → \'Book a consultation\'', { color: 'coral' }),
      section('footer'),
    ],
  },
  {
    code: 'T2', name: 'Service Parent',
    description: 'Hub page for a service area. Introduces the area, links down to child services, answers common questions.',
    blocks: [
      section('navigation'),
      section('page-header', 'Clear category intro.\nCTA → \'Book a consultation\''),
      section('breadcrumbs'),
      section('feature-list', 'Links to each child service with image and one line.', { title: 'Explore the range' }),
      two(['text', 'Why choose us, in three short points.', { title: 'Choosing with confidence' }], ['form', 'Short enquiry form.', { title: 'Quick contact' }]),
      section('faq', 'Category-level accordion for long-tail SEO.'),
      section('cta', '', { color: 'coral' }),
      section('footer'),
    ],
  },
  {
    code: 'T3', name: 'Service Child',
    description: 'Conversion-focused single service page. Long-form content against a persistent contact card.',
    blocks: [
      section('navigation'),
      section('page-header', 'Service intro.\nCTA → \'Enquire now\''),
      section('breadcrumbs'),
      section('text-image', 'Short intro with three benefit ticks.', { title: 'Overview' }),
      section('gallery', 'Recent projects for this service.'),
      section('feature', 'Steps from enquiry to finished job.\n- Consult\n- Plan\n- Deliver', { title: 'Process' }),
      section('faq', 'Service-level accordion for long-tail SEO.'),
      section('feature-list', 'Sibling services, for internal linking.', { title: 'Related services' }),
      section('cta', '', { color: 'coral' }),
      section('footer'),
    ],
  },
  {
    code: 'T4', name: 'Standard Internal',
    description: 'Simple flexible content page for about, values, policies and general information.',
    blocks: [
      section('navigation'),
      section('page-header'),
      section('breadcrumbs'),
      section('text-image', 'Split layout with image and narrative.', { title: 'Our story' }),
      section('text', 'Flexible content blocks.'),
      section('cta', '', { color: 'coral' }),
      section('footer'),
    ],
  },
  {
    code: 'T5', name: 'Team',
    description: 'People listing with individual profiles. Each profile links to its service areas for internal linking.',
    blocks: [
      section('navigation'),
      section('page-header'),
      section('team', 'Grid of people.\n- Photo, name, role\n- Links to their service areas'),
      section('cta', 'Join us.\nCTA → \'View careers\'', { color: 'coral' }),
      section('footer'),
    ],
  },
  {
    code: 'T6', name: 'Contact',
    description: 'Short enquiry form beside office details and map. Minimal distractions.',
    blocks: [
      section('navigation'),
      section('page-header', "CTA → 'Call us'"),
      two(['form', '- Name\n- Email\n- Phone\n- Message'], ['map', 'Office address, hours and directions.']),
      section('faq', 'Handle the last objections before enquiring.'),
      section('footer'),
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
