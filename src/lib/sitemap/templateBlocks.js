// Page template outlines, in the style of the SEO Foundations Figma page
// cards: a stack of section rows, each a titled block with a short
// description and bullet points. A row holds one block, or two side by side.
//
// Stored in sitemap_page_templates.blocks (jsonb):
//   [{ id, cols: [{ id, type, title, details, color, image }] }]
//     type    a SECTION_TYPES key, or '' for a free block
//     details plain text; lines starting with "-", "*" or "•" show as bullets
//     color   a BLOCK_COLOURS key (grey when missing)
//     image   null | 'left' | 'right' (Image + Text: an image beside the text)
//
// The first version stored rows of { t, c } blocks; normaliseBlocks reads
// both, so old templates open as they were and save in the new shape.

export const SECTION_TYPES = [
  { key: 'navigation', label: 'Navigation', hint: 'Nav bar, mega menu or simple links.' },
  { key: 'hero', label: 'Hero Header', hint: 'Clear value proposition with CTA.' },
  { key: 'page-header', label: 'Page Header', hint: 'Page name and introduction.' },
  { key: 'breadcrumbs', label: 'Breadcrumbs', hint: 'Trail back up the hierarchy.' },
  { key: 'logos', label: 'Client Logos', hint: 'Showcase client logos in a carousel or grid.' },
  { key: 'testimonials', label: 'Testimonials', hint: 'Showcase client testimonials or reviews.' },
  { key: 'cta', label: 'Call to Action', hint: 'Prompt visitors to take a specific action.' },
  { key: 'feature-list', label: 'Feature List', hint: 'Overview of features or services offered.' },
  { key: 'feature', label: 'Feature', hint: 'Highlight a key feature.' },
  { key: 'team', label: 'Team', hint: 'Showcase team members.' },
  { key: 'map', label: 'Map', hint: 'Showcase location or contact details.' },
  { key: 'faq', label: 'FAQs', hint: 'Frequently asked questions with answers.' },
  { key: 'form', label: 'Contact Form', hint: 'CTA with contact form.' },
  { key: 'posts', label: 'Post List', hint: 'Browse blog posts or recent news.' },
  { key: 'text', label: 'Text Block', hint: 'Convey simple textual information.' },
  { key: 'image', label: 'Image Block', hint: 'Highlight visual content or imagery.' },
  { key: 'text-image', label: 'Image + Text', hint: 'Combine textual information with visuals.' },
  { key: 'gallery', label: 'Gallery', hint: 'Showcase a collection of images or media.' },
  { key: 'banner', label: 'Banner', hint: 'Reinforce value proposition.' },
  { key: 'products', label: 'Product List', hint: 'Browse a list of products.' },
  { key: 'product', label: 'Product Overview', hint: 'Product details and option to add to cart.' },
  { key: 'footer', label: 'Footer', hint: 'Footer links, contact details and legal.' },
]

export const SECTION_BY_KEY = Object.fromEntries(SECTION_TYPES.map(s => [s.key, s]))

// Soft fills, so a coloured block still reads as a wireframe.
export const BLOCK_COLOURS = [
  { key: 'grey', label: 'Grey', bg: '#EBEBEB', border: '#DCDCDC', text: '#1A1A1A', sub: '#6B6B6B' },
  { key: 'white', label: 'White', bg: '#FFFFFF', border: '#DCDCDC', text: '#1A1A1A', sub: '#6B6B6B' },
  { key: 'coral', label: 'Coral', bg: '#FCE0D8', border: '#F2A090', text: '#1A1A1A', sub: '#8A4A3C' },
  { key: 'yellow', label: 'Yellow', bg: '#FDF3C7', border: '#F2DC7E', text: '#1A1A1A', sub: '#7A6620' },
  { key: 'green', label: 'Green', bg: '#DDF3E2', border: '#A6DDB3', text: '#1A1A1A', sub: '#3F6E4A' },
  { key: 'blue', label: 'Blue', bg: '#DCEBFB', border: '#A9CBF2', text: '#1A1A1A', sub: '#3D5F86' },
  { key: 'purple', label: 'Purple', bg: '#EAE3FB', border: '#C6B6F2', text: '#1A1A1A', sub: '#5B4B8A' },
  { key: 'dark', label: 'Dark', bg: '#2A2A2A', border: '#1A1A1A', text: '#FFFFFF', sub: '#C9C9C9' },
]

export const BLOCK_COLOUR = Object.fromEntries(BLOCK_COLOURS.map(c => [c.key, c]))
export const colourOf = key => BLOCK_COLOUR[key] || BLOCK_COLOUR.grey

// The coloured dot on each template label, by its place in the list, the
// same order as the Figma key (Template 1 red, 2 orange, 3 yellow...).
export const TEMPLATE_DOTS = ['#F87171', '#FB923C', '#FACC15', '#4ADE80', '#2DD4BF', '#38BDF8', '#60A5FA', '#A78BFA', '#F472B6', '#9CA3AF']
export const templateDot = index => TEMPLATE_DOTS[((index % TEMPLATE_DOTS.length) + TEMPLATE_DOTS.length) % TEMPLATE_DOTS.length]

export const MAX_COLS = 2

const rid = () => Math.random().toString(36).slice(2, 10)

export function newBlock(fields = {}) {
  const type = fields.type ?? ''
  return {
    id: rid(),
    type,
    title: fields.title ?? (SECTION_BY_KEY[type]?.label || ''),
    details: fields.details ?? '',
    color: fields.color ?? 'grey',
    image: fields.image ?? (type === 'text-image' ? 'left' : null),
  }
}

export function newRow(fields = {}) {
  return { id: rid(), cols: [newBlock(fields)] }
}

// Old { t, c } styles onto the new colours.
const OLD_COLOUR = { hero: 'dark', cta: 'coral', tall: 'grey', '': 'grey' }

/** Any stored blocks value → rows in the current shape. Ids are stable for old data (by position). */
export function normaliseBlocks(blocks) {
  if (!Array.isArray(blocks)) return []
  return blocks.map((row, ri) => {
    if (Array.isArray(row)) {
      return {
        id: `r${ri}`,
        cols: row.slice(0, MAX_COLS).map((b, bi) => ({
          id: `r${ri}c${bi}`, type: '', title: b?.t || '', details: '', color: OLD_COLOUR[b?.c || ''] || 'grey', image: null,
        })),
      }
    }
    const cols = (row?.cols || []).slice(0, MAX_COLS).map((b, bi) => ({
      id: b.id || `r${ri}c${bi}`,
      type: b.type || '',
      title: b.title || '',
      details: b.details || '',
      color: b.color || 'grey',
      image: b.image === 'left' || b.image === 'right' ? b.image : null,
    }))
    return { id: row?.id || `r${ri}`, cols: cols.length ? cols : [newBlock()] }
  })
}

/** Details text → [{ kind: 'text' | 'bullet', text }] for display. */
export function parseDetails(details) {
  return String(details || '')
    .split('\n')
    .map(l => l.trimEnd())
    .filter(l => l.trim() !== '')
    .map(l => {
      const m = l.match(/^\s*[-*•]\s+(.*)$/)
      return m ? { kind: 'bullet', text: m[1] } : { kind: 'text', text: l.trim() }
    })
}

/** Quick builder for seed data: section(type, details, extra) */
export function section(type, details = '', extra = {}) {
  return { cols: [newBlock({ type, details, ...extra })] }
}
