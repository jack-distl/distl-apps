// The copywriting brief: one Markdown file with everything a writer, or a
// Claude prompt, needs per page. Keywords, the sections in order with their
// brief and word range, dynamic fields filled in, and any draft so far.
//
// It round-trips: every section that takes copy has a slot between
//   <!-- copy page=<page id> section=<section id> -->
//   ...copy...
//   <!-- /copy -->
// and parseCopyBrief reads a filled-in file back into the Copywriting tab.

import { orderedPages, isHome, templateLabel } from './tree.js'
import { slugify } from './csv.js'
import { normaliseBlocks, dynamicValues, resolveDynamic, parseDetails, parseWords, formatWords, totalWords, countWords, isListBullet } from './templateBlocks.js'


const md = s => String(s ?? '').replace(/\|/g, '\\|').trim()

function pageStatus(page, sections, copy) {
  if (page.copy_confirmed) return 'Copy confirmed, no changes needed'
  const written = sections.filter(sec => countWords(copy[sec.id]?.body)).length
  if (!written) return 'Not started'
  return `In progress (${written} of ${sections.length} sections drafted)`
}

export function buildCopyBrief(sitemap, clientName = '') {
  const { ordered, hierarchy } = orderedPages(sitemap.pages || [])
  const templates = sitemap.templates || []
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const out = []

  out.push(`# Copywriting brief${clientName ? `: ${clientName}` : ''}`)
  out.push('')
  out.push(`Prepared by Distl on ${date}. ${ordered.length} page${ordered.length === 1 ? '' : 's'}, in sitemap order.`)
  out.push('')
  out.push('## How to use this brief')
  out.push('')
  out.push('- Each page lists its keywords, then its sections in the order they appear on the page.')
  out.push('- Write copy for each section within its recommended word range. The page length is the sum of those ranges.')
  out.push('- Use the primary keyword naturally in the page heading and once or twice in the body. Work the supporting keywords in where they read naturally. Never force them.')
  out.push('- Lists marked "filled in from the sitemap" are links to other pages that the site builds automatically. Don\'t write them; write the copy around them.')
  out.push('- Sections with no word range are structural (navigation, breadcrumbs, footer) and need no copy unless their brief says otherwise.')
  out.push('- Write each section\'s copy between its `<!-- copy ... -->` and `<!-- /copy -->` lines. Copy already there is the current draft: improve it rather than starting again, unless the brief says otherwise.')
  out.push('- Keep those two marker lines exactly as they are and change nothing else in them. That is how the finished file is imported back into the Distl platform.')
  out.push('- Australian English. Clear, warm and direct, no jargon.')
  out.push('- If you are an AI model filling this in: return the whole document, unchanged apart from the copy between the markers, as plain Markdown without a code fence.')
  out.push('')

  for (const page of ordered) {
    const template = templates.find(t => t.id === page.template_id)
    const sections = template ? normaliseBlocks(template.blocks) : []
    const copy = sitemap.copy?.[page.id] || {}
    const values = dynamicValues(page, hierarchy, sitemap.dynamic_fields)
    const parent = hierarchy.parentOf(page)
    const total = totalWords(sections)

    out.push('---')
    out.push('')
    out.push(`## ${page.name}`)
    out.push('')
    out.push(`- **URL:** ${page.url}`)
    if (parent && !isHome(page)) out.push(`- **Sits under:** ${parent.name}`)
    out.push(`- **Template:** ${template ? templateLabel(template) : 'None yet'}`)
    if (page.status === 'functional') out.push('- **Page type:** Functional (no keyword focus)')
    out.push(`- **Status:** ${pageStatus(page, sections, copy)}`)
    if (total) out.push(`- **Page length:** ${formatWords(total)} words`)
    if (page.h1) out.push(`- **Recommended H1:** ${page.h1}`)
    if (page.title_tag) out.push(`- **Title tag:** ${page.title_tag}`)
    if (page.meta_description) out.push(`- **Meta description:** ${page.meta_description}`)
    out.push('')

    const kws = [...(page.keywords || [])].sort((a, b) => (b.is_primary - a.is_primary) || ((b.volume || 0) - (a.volume || 0)))
    out.push('### Keywords')
    out.push('')
    if (kws.length) {
      out.push('| Keyword | Searches / month | Role |')
      out.push('| --- | ---: | --- |')
      for (const k of kws) out.push(`| ${md(k.keyword)} | ${k.volume ?? ''} | ${k.is_primary ? 'Primary' : 'Supporting'} |`)
    } else {
      out.push('No keywords for this page.')
    }
    out.push('')

    out.push('### Sections')
    out.push('')
    if (!sections.length) {
      out.push('No template yet, so no sections. Ask Distl before writing this page.')
      out.push('')
      continue
    }
    sections.forEach((sec, i) => {
      const range = parseWords(sec.words)
      const title = resolveDynamic(sec.title, values) || 'Untitled section'
      const lines = parseDetails(resolveDynamic(sec.details, values))
      const body = (copy[sec.id]?.body || '').trim()
      const takesCopy = !!(range || lines.length || body)
      out.push(`#### ${i + 1}. ${title}${range ? ` (${formatWords(range)} words)` : takesCopy ? '' : ' (no copy needed)'}`)
      if (lines.length) {
        out.push('')
        for (const l of lines) out.push(`${l.kind === 'bullet' ? '- ' : ''}${l.text}${l.kind === 'bullet' ? '' : '  '}`)
        if (String(sec.details || '').split('\n').some(l => isListBullet(l, values))) out.push('', '_The list above is filled in from the sitemap._')
      }
      if (takesCopy) {
        out.push('')
        out.push(`<!-- copy page=${page.id} section=${sec.id} -->`)
        out.push(body)
        out.push('<!-- /copy -->')
      }
      out.push('')
    })
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n'
}

export function copyBriefFilename(clientName) {
  return `${slugify(clientName) || 'sitemap'}-copywriting-brief.md`
}

const SLOT = /<!--\s*copy\s+page=(\S+)\s+section=(\S+)\s*-->([\s\S]*?)<!--\s*\/copy\s*-->/g

/**
 * Read a filled-in brief back. Returns { items, unknown } where each item is
 * { pageId, sectionId, page, sectionTitle, body, before, change } and change is
 * 'new' | 'changed' | 'same' | 'empty'. Slots for pages or sections that no
 * longer exist land in `unknown`. Empty slots never wipe existing copy.
 */
export function parseCopyBrief(text, sitemap) {
  const items = []
  let unknown = 0
  const src = String(text || '').replace(/\r\n/g, '\n').replace(/^```(?:markdown|md)?\n|\n```\s*$/g, '')
  for (const m of src.matchAll(SLOT)) {
    const [, pageId, sectionId, raw] = m
    const page = (sitemap.pages || []).find(p => p.id === pageId)
    const template = page && (sitemap.templates || []).find(t => t.id === page.template_id)
    const section = template && normaliseBlocks(template.blocks).find(s => s.id === sectionId)
    if (!page || !section) { unknown++; continue }
    const body = raw.trim()
    const before = (sitemap.copy?.[pageId]?.[sectionId]?.body || '').trim()
    const change = !body ? 'empty' : !before ? 'new' : body === before ? 'same' : 'changed'
    items.push({ pageId, sectionId, page, sectionTitle: section.title, body, before, change })
  }
  return { items, unknown }
}
