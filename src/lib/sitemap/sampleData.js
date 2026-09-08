// Sample sitemap (Hammond Legal, lifted from the prototype). Used when
// Supabase is not configured and by scripts/sitemap-export-parity.mjs.
// Sample data only.

import { DEFAULT_MENUS, DEFAULT_PAGE_TEMPLATES, DEFAULT_PLAN_VERSION_NAME } from './defaults.js'

const kw = (k, v, primary = false) => ({ keyword: k, volume: v, is_primary: primary })

const tree = {
  name: 'Home', url: '/', status: 'keep', template: 'T1',
  keywords: [kw('lawyers perth', 2400, true), kw('lawyer perth', 1900), kw('perth lawyer', 880), kw('best lawyer in perth', 480)],
  title: 'Lawyers Perth | Trusted Legal Advice | Hammond Legal',
  meta: 'Experienced lawyers in Perth across criminal, family and commercial law. Speak with our team today.',
  h1: 'Trusted Lawyers in Perth',
  children: [
    { name: 'Criminal Law', url: '/criminal-law/', status: 'keep', template: 'T2',
      keywords: [kw('criminal lawyer perth', 480, true), kw('criminal law perth', 480), kw('perth criminal lawyers', 320), kw('best criminal lawyer perth', 260)],
      title: 'Criminal Lawyer Perth | Defence Experts | Hammond Legal',
      meta: 'Charged with an offence in WA? Our Perth criminal lawyers build a strong defence and guide you through every step.',
      h1: 'Criminal Lawyers Perth',
      children: [
        { name: 'Disorderly Conduct', url: '/criminal-law/disorderly-conduct/', status: 'add', template: 'T3',
          keywords: [kw('disorderly conduct', 480, true), kw('disorderly misconduct', 480), kw('disorderly conduct charge', 40)],
          title: 'Disorderly Conduct Charges WA | Hammond Legal',
          meta: 'Facing a disorderly conduct charge in WA? Learn the penalties and how our Perth lawyers can defend you.',
          h1: 'Disorderly Conduct Charges in WA' },
        { name: 'Restraining Orders', url: '/criminal-law/restraining-orders/', status: 'add', template: 'T3',
          keywords: [kw('misconduct restraining order', 320, true), kw('misconduct restraining order wa', 140), kw('objecting to a violence restraining order', 140), kw('contesting a vro', 90)],
          title: 'Restraining Orders WA | VRO and MRO Advice | Hammond Legal',
          meta: 'Need to apply for or contest a restraining order in WA? Our lawyers explain your options clearly.',
          h1: 'Restraining Order Lawyers in WA' },
        { name: 'Traffic Offences', url: '/criminal-law/traffic-offences/', status: 'keep', template: 'T3',
          keywords: [kw('traffic lawyers perth', 210, true), kw('perth traffic lawyers', 210), kw('reckless driving wa', 110), kw('dangerous driving wa', 50)],
          title: 'Traffic Lawyers Perth | Driving Offences | Hammond Legal',
          meta: 'Perth traffic lawyers for reckless and dangerous driving charges. Protect your licence and your record.',
          h1: 'Traffic Offence Lawyers Perth' },
        { name: 'Extraordinary Drivers Licences', url: '/criminal-law/extraordinary-drivers-licence/', status: 'opportunity', template: 'T3',
          keywords: [kw('extraordinary licence wa rules', 90, true), kw('extraordinary licence wa application form', 50), kw('extraordinary licence wa cost', 30)],
          title: 'Extraordinary Drivers Licence WA | Apply | Hammond Legal',
          meta: 'Lost your licence in WA? We help you apply for an extraordinary drivers licence so you can keep working.',
          h1: 'Extraordinary Drivers Licence Applications' },
      ] },
    { name: 'Family Law', url: '/family-law/', status: 'keep', template: 'T2',
      keywords: [kw('family lawyers mandurah', 390, true), kw('family lawyers joondalup', 320), kw('family lawyers bunbury', 260), kw('wa family law court', 210)],
      title: 'Family Lawyers Perth | Separation Advice | Hammond Legal',
      meta: 'Compassionate family lawyers serving Perth and regional WA. Clear advice on separation, custody and property.',
      h1: 'Family Lawyers in Perth and WA',
      children: [
        { name: 'Postnuptial Agreements', url: '/family-law/postnuptial-agreements/', status: 'opportunity', template: 'T3',
          keywords: [kw('post nuptial contract', 480, true), kw('postnuptial agreement', 480), kw('post nup agreement', 480)],
          title: 'Postnuptial Agreements WA | Binding Advice | Hammond Legal',
          meta: 'Thinking about a postnuptial agreement? Our WA family lawyers draft agreements that hold up.',
          h1: 'Postnuptial Agreement Lawyers' },
      ] },
    { name: 'Wills & Estates', url: '/wills-estates/', status: 'keep', template: 'T2',
      keywords: [kw('legal wills perth', 590, true), kw('wills perth wa', 590), kw('wills lawyers perth', 390), kw('estate planning lawyer perth', 320)],
      title: 'Wills Lawyers Perth | Estate Planning | Hammond Legal',
      meta: 'Expert wills lawyers in Perth. We protect your legacy and your loved ones.',
      h1: 'Wills and Estate Planning Perth',
      children: [
        { name: 'Contesting a Will', url: '/wills-estates/contesting-a-will/', status: 'add', template: 'T3',
          keywords: [kw('contesting a will wa', 210, true), kw('contesting a will western australia', 210), kw('challenging a will in western australia', 210)],
          title: 'Contesting a Will WA | Know Your Rights | Hammond Legal',
          meta: 'Think a will is unfair? Learn who can contest a will in WA and the time limits that apply.',
          h1: 'Contesting a Will in WA' },
        { name: 'Probate', url: '/wills-estates/probate/', status: 'add', template: 'T3',
          keywords: [kw('probate lawyers perth', 320, true), kw('probate lawyer perth', 320), kw('probate lawyers perth wa', 320)],
          title: 'Probate Lawyers Perth | Estate Admin | Hammond Legal',
          meta: 'Applying for probate in WA? Our Perth probate lawyers handle the process from start to finish.',
          h1: 'Probate Lawyers Perth' },
        { name: 'Power of Attorney', url: '/wills-estates/power-of-attorney/', status: 'opportunity', template: 'T3',
          keywords: [kw('enduring power of attorney form wa', 390, true), kw('how to get power of attorney in wa', 70), kw('enduring power of attorney wa responsibilities', 30)],
          title: 'Enduring Power of Attorney WA | Guide | Hammond Legal',
          meta: 'How do you set up an enduring power of attorney in WA? Our lawyers walk you through it.',
          h1: 'Enduring Power of Attorney in WA' },
      ] },
    { name: 'Commercial Law', url: '/commercial-law/', status: 'keep', template: 'T2',
      keywords: [kw('commercial lawyers perth', 480, true), kw('commercial law perth', 480), kw('perth commercial lawyers', 480), kw('business lawyer perth', 210)],
      title: 'Commercial Lawyers Perth | Business Law | Hammond Legal',
      meta: 'Practical commercial lawyers for Perth businesses. Contracts, disputes and advice that keeps you moving.',
      h1: 'Commercial Lawyers Perth' },
    { name: 'Employment Law', url: '/employment-law/', status: 'keep', template: 'T2',
      keywords: [kw('perth employment lawyers', 320, true), kw('employment lawyers perth wa', 320), kw('workplace lawyers perth', 320), kw('employment law perth', 70)],
      title: 'Employment Lawyers Perth | Workplace Law | Hammond Legal',
      meta: 'Employment lawyers for Perth employees and employers. Unfair dismissal, contracts and workplace disputes.',
      h1: 'Employment Lawyers Perth' },
    { name: 'Litigation', url: '/litigation/', status: 'keep', template: 'T2',
      keywords: [kw('litigation lawyer perth', 260, true), kw('litigation lawyers perth', 110), kw('dispute resolution lawyers perth', 70)],
      title: 'Litigation Lawyers Perth | Disputes | Hammond Legal',
      meta: 'When disputes escalate, our Perth litigation lawyers protect your position in and out of court.',
      h1: 'Litigation and Dispute Resolution' },
    { name: 'Property Law', url: '/property-law/', status: 'opportunity', template: 'T2',
      keywords: [kw('property lawyer wa', 320, true), kw('wa property lawyers', 320), kw('commercial property lawyers perth', 70)],
      title: 'Property Lawyers WA | Settlements | Hammond Legal',
      meta: 'Property lawyers across WA for settlements, leases and disputes. Get clear advice before you sign.',
      h1: 'Property Lawyers in WA' },
    { name: 'Notary Public', url: '/notary-public/', status: 'opportunity', template: 'T2',
      keywords: [kw('free notary public perth', 70, true), kw('cheap notary public perth', 50), kw('notary public joondalup', 40)],
      title: 'Notary Public Perth | Document Certification | Hammond Legal',
      meta: 'Need a notary public in Perth? Fixed-fee document certification with fast turnaround.',
      h1: 'Notary Public Services Perth' },
  ],
  functional: [
    { name: 'About Us', url: '/about/', status: 'functional', template: 'T4', keywords: [], title: 'About Us | Hammond Legal', meta: 'Meet the team behind Hammond Legal and the values that drive our work.', h1: 'About Hammond Legal' },
    { name: 'Our People', url: '/about/our-people/', status: 'functional', template: 'T5', keywords: [], title: 'Our People | Hammond Legal', meta: 'Meet the lawyers and support staff at Hammond Legal.', h1: 'Our People' },
    { name: 'Contact Us', url: '/contact/', status: 'functional', template: 'T6', keywords: [], title: 'Contact Us | Hammond Legal', meta: 'Get in touch with Hammond Legal in Perth. Book a confidential consultation today.', h1: 'Contact Hammond Legal' },
  ],
}

// Performance for the "6 Month Review". positions: keyword → [position, change]
// where change is movement since the previous review ('new' = did not exist).
// queries: [query, clicks, change]; anon: [clicks, change].
const perf6m = {
  '/': { positions: { 'lawyers perth': [12, 23], 'lawyer perth': [14, 19], 'perth lawyer': [11, 21], 'best lawyer in perth': [9, 14] },
    queries: [['hammond legal', 88, 31], ['lawyers perth', 34, 34], ['hammond legal perth', 21, 8]], anon: [43, 22] },
  '/criminal-law/': { positions: { 'criminal lawyer perth': [8, 15], 'criminal law perth': [7, 16], 'perth criminal lawyers': [9, 12], 'best criminal lawyer perth': [11, 9] },
    queries: [['criminal lawyer perth', 26, 26], ['criminal lawyers perth', 14, 14]], anon: [22, 15] },
  '/criminal-law/disorderly-conduct/': { positions: { 'disorderly conduct': [4, 'new'], 'disorderly misconduct': [6, 'new'], 'disorderly conduct charge': [3, 'new'] },
    queries: [['disorderly conduct wa', 31, 'new'], ['disorderly conduct charge', 12, 'new']], anon: [18, 'new'] },
  '/criminal-law/restraining-orders/': { positions: { 'misconduct restraining order': [7, 'new'], 'misconduct restraining order wa': [5, 'new'], 'objecting to a violence restraining order': [9, 'new'], 'contesting a vro': [11, 'new'] },
    queries: [['misconduct restraining order wa', 19, 'new'], ['contest vro wa', 8, 'new']], anon: [14, 'new'] },
  '/criminal-law/traffic-offences/': { positions: { 'traffic lawyers perth': [6, 9], 'perth traffic lawyers': [6, 8], 'reckless driving wa': [13, 6], 'dangerous driving wa': [15, 4] },
    queries: [['traffic lawyer perth', 17, 11], ['reckless driving wa penalty', 9, 9]], anon: [12, 6] },
  '/criminal-law/extraordinary-drivers-licence/': { positions: { 'extraordinary licence wa rules': [3, 'new'], 'extraordinary licence wa application form': [4, 'new'], 'extraordinary licence wa cost': [2, 'new'] },
    queries: [['extraordinary licence wa', 22, 'new'], ['edl application wa', 7, 'new']], anon: [9, 'new'] },
  '/family-law/': { positions: { 'family lawyers mandurah': [18, 7], 'family lawyers joondalup': [15, 9], 'family lawyers bunbury': [21, 4], 'wa family law court': [24, 3] },
    queries: [['family lawyer perth', 11, 7]], anon: [16, 9] },
  '/family-law/postnuptial-agreements/': { positions: { 'post nuptial contract': [8, 'new'], 'postnuptial agreement': [10, 'new'], 'post nup agreement': [9, 'new'] },
    queries: [['postnuptial agreement australia', 24, 'new'], ['post nup wa', 6, 'new']], anon: [20, 'new'] },
  '/wills-estates/': { positions: { 'legal wills perth': [5, 11], 'wills perth wa': [6, 10], 'wills lawyers perth': [4, 13], 'estate planning lawyer perth': [8, 7] },
    queries: [['wills perth', 29, 18], ['wills lawyer perth', 16, 12]], anon: [25, 13] },
  '/wills-estates/contesting-a-will/': { positions: { 'contesting a will wa': [3, 'new'], 'contesting a will western australia': [3, 'new'], 'challenging a will in western australia': [5, 'new'] },
    queries: [['contesting a will wa', 38, 'new'], ['can i contest a will wa', 14, 'new'], ['time limit contest will wa', 9, 'new']], anon: [24, 'new'] },
  '/wills-estates/probate/': { positions: { 'probate lawyers perth': [6, 'new'], 'probate lawyer perth': [6, 'new'], 'probate lawyers perth wa': [5, 'new'] },
    queries: [['probate lawyers perth', 21, 'new'], ['probate wa', 8, 'new']], anon: [13, 'new'] },
  '/wills-estates/power-of-attorney/': { positions: { 'enduring power of attorney form wa': [12, 'new'], 'how to get power of attorney in wa': [7, 'new'], 'enduring power of attorney wa responsibilities': [6, 'new'] },
    queries: [['enduring power of attorney wa', 17, 'new']], anon: [11, 'new'] },
  '/commercial-law/': { positions: { 'commercial lawyers perth': [9, 8], 'commercial law perth': [10, 8], 'perth commercial lawyers': [9, 10], 'business lawyer perth': [14, 5] },
    queries: [['commercial lawyer perth', 13, 8]], anon: [15, 7] },
  '/employment-law/': { positions: { 'perth employment lawyers': [11, 10], 'employment lawyers perth wa': [10, 12], 'workplace lawyers perth': [13, 7], 'employment law perth': [9, 11] },
    queries: [['employment lawyer perth', 12, 9], ['unfair dismissal lawyer perth', 7, 7]], anon: [10, 5] },
  '/litigation/': { positions: { 'litigation lawyer perth': [13, 6], 'litigation lawyers perth': [14, 6], 'dispute resolution lawyers perth': [11, 8] },
    queries: [['litigation lawyer perth', 6, 4]], anon: [8, 4] },
  '/property-law/': { positions: { 'property lawyer wa': [19, 'new'], 'wa property lawyers': [20, 'new'], 'commercial property lawyers perth': [16, 'new'] },
    queries: [['property lawyer perth', 4, 'new']], anon: [7, 'new'] },
  '/notary-public/': { positions: { 'free notary public perth': [5, 'new'], 'cheap notary public perth': [4, 'new'], 'notary public joondalup': [6, 'new'] },
    queries: [['notary public perth', 16, 'new'], ['notary joondalup', 5, 'new']], anon: [6, 'new'] },
  '/about/': { positions: {}, queries: [['hammond legal about', 5, 2]], anon: [9, 3] },
  '/about/our-people/': { positions: {}, queries: [['hammond legal lawyers', 7, 4]], anon: [11, 6] },
  '/contact/': { positions: {}, queries: [['hammond legal contact', 12, 5]], anon: [8, 2] },
}

/**
 * Build the sample sitemap in the app's data shape. Two review versions are
 * synthesised: a "Baseline Review" reconstructed from the 6 month changes,
 * and the "6 Month Review" itself, so the change indicators have data.
 */
export function buildSampleSitemap(clientId = 'sample') {
  const sitemapId = `sm-${clientId}`
  const templates = DEFAULT_PAGE_TEMPLATES.map((t, i) => ({
    id: `tpl-${clientId}-${i + 1}`, sitemap_id: sitemapId, ...t, sort_order: i,
  }))
  const tplByCode = Object.fromEntries(templates.map(t => [t.code, t.id]))

  const pages = []
  let pageIdx = 0
  let kwIdx = 0
  function add(node) {
    const id = `page-${clientId}-${++pageIdx}`
    const page = {
      id, sitemap_id: sitemapId,
      name: node.name, url: node.url, status: node.status,
      template_id: tplByCode[node.template] || null,
      title_tag: node.title || '', meta_description: node.meta || '', h1: node.h1 || '',
      post_type: 'page', menu_names: null, sort_order: pages.length,
      keywords: (node.keywords || []).map((k, i) => ({
        id: `kw-${clientId}-${++kwIdx}`, page_id: id, keyword: k.keyword, volume: k.volume, is_primary: k.is_primary, sort_order: i,
      })),
    }
    pages.push(page)
    ;(node.children || []).forEach(add)
  }
  add(tree)
  tree.functional.forEach(add)

  const pageByUrl = Object.fromEntries(pages.map(p => [p.url, p]))
  const kwByText = {}
  for (const p of pages) for (const k of p.keywords) (kwByText[k.keyword] ||= []).push(k)

  function reviewVersion(id, name, sortOrder, pick, uploadedAt) {
    const pageMetrics = {}
    const keywordPositions = {}
    const queries = []
    for (const [url, pf] of Object.entries(perf6m)) {
      const page = pageByUrl[url]
      if (!page) continue
      let clicks = 0
      let qi = 0
      for (const [q, c, chg] of pf.queries) {
        const v = pick(c, chg)
        if (v == null) continue
        clicks += v
        queries.push({ id: `q-${id}-${page.id}-${qi}`, version_id: id, page_id: page.id, query: q, clicks: v, impressions: v * 18, position: null, sort_order: qi++ })
      }
      const anon = pick(pf.anon[0], pf.anon[1])
      if (anon != null) clicks += anon
      if (clicks > 0 || Object.keys(pf.positions).length) {
        pageMetrics[page.id] = { version_id: id, page_id: page.id, clicks, impressions: clicks * 22, position: null }
      }
      for (const [kwText, [pos, chg]] of Object.entries(pf.positions)) {
        const v = pick(pos, chg, true)
        if (v == null) continue
        for (const k of kwByText[kwText] || []) {
          keywordPositions[k.id] = { version_id: id, keyword_id: k.id, position: v, ranking_url: url }
        }
      }
    }
    return {
      id, sitemap_id: sitemapId, name, type: 'review', sort_order: sortOrder, created_at: uploadedAt,
      uploads: [
        { id: `up-${id}-1`, version_id: id, kind: 'gsc_pages', filename: `hammond-gsc-pages-${sortOrder}.csv`, uploaded_at: uploadedAt, row_count: 20, matched_count: 20, unmatched: [] },
        { id: `up-${id}-2`, version_id: id, kind: 'gsc_queries', filename: `hammond-gsc-queries-${sortOrder}.csv`, uploaded_at: uploadedAt, row_count: 48, matched_count: 40, unmatched: [] },
        { id: `up-${id}-3`, version_id: id, kind: 'rankings', filename: `hammond-rankings-${sortOrder}.csv`, uploaded_at: uploadedAt, row_count: 58, matched_count: 58, unmatched: [] },
      ],
      pageMetrics, keywordPositions, queries,
    }
  }

  // Baseline: reverse the recorded change. Positions: previous = current + change
  // (positive change = moved up). Clicks: previous = current - change. 'new' = absent.
  const baseline = reviewVersion('ver-' + clientId + '-2', 'Baseline Review', 1,
    (cur, chg, isPos) => chg === 'new' ? null : (isPos ? cur + chg : Math.max(0, cur - chg)),
    '2026-01-14T00:00:00Z')
  const sixMonth = reviewVersion('ver-' + clientId + '-3', '6 Month Review', 2,
    (cur) => cur, '2026-07-14T00:00:00Z')

  const plan = {
    id: `ver-${clientId}-1`, sitemap_id: sitemapId, name: DEFAULT_PLAN_VERSION_NAME, type: 'plan', sort_order: 0,
    created_at: '2025-11-01T00:00:00Z', uploads: [], pageMetrics: {}, keywordPositions: {}, queries: [],
  }

  return {
    id: sitemapId,
    client_id: clientId,
    domain: 'hammondlegal.com.au',
    review_cadence: 'quarterly',
    menus: [...DEFAULT_MENUS],
    templates,
    pages,
    versions: [plan, baseline, sixMonth],
  }
}
