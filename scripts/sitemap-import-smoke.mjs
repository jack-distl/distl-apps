// Smoke test for the Sitemap Tool import pipeline.
//   node scripts/sitemap-import-smoke.mjs
// 1. Landing from seo-foundations style files (keyword clusters + sitemap sheet).
// 2. Round trip: the tool's own exports re-import with zero diff.
// 3. Review matching from GSC pages/queries + rank tracker exports.

import { buildSampleSitemap } from '../src/lib/sitemap/sampleData.js'
import { parseKeywordClusters, parseSitemapSheet, parseGscPages, parseGscQueries, parseRankings, parseVolumes, detectKind } from '../src/lib/sitemap/importers.js'
import { buildLandingPlan, diffLanding, planOperations } from '../src/lib/sitemap/landing.js'
import { buildSitemapDataCsv, buildKeywordClusterCsv } from '../src/lib/sitemap/dataExport.js'
import { buildReviewSnapshot } from '../src/lib/sitemap/matching.js'
import { rowsToCsv, parseCsvRows, decodeBuffer } from '../src/lib/sitemap/csv.js'

let failures = 0
const check = (c, m) => { console.log(`  ${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) failures++ }

// ─── 1. Landing from skill-format files ─────────────────────
console.log('Landing from seo-foundations files')
const clusters = rowsToCsv([
  ['Category', 'Keywords', 'Search Volume'],
  ['Home', 'lawyers perth', 2400],
  ['', 'lawyer perth', 1900],
  ['Criminal Law', 'criminal lawyer perth', 480],
  ['Criminal Law', 'criminal law perth', 480],
  ['Criminal Law > Disorderly Conduct', 'disorderly conduct', 480],
  ['Criminal Law > Disorderly Conduct', 'disorderly conduct charge', 40],
  ['Wills & Estates > Probate', 'probate lawyers perth', 320],
])
const sheet = rowsToCsv([
  ['Page', 'Parent', 'Title', 'Meta Description'],
  ['Home', '', 'Lawyers Perth | Hammond Legal', 'Experienced lawyers in Perth.'],
  ['Criminal Law', '', 'Criminal Lawyer Perth | Hammond Legal', 'Charged with an offence in WA? We can help.'],
  ['Disorderly Conduct', 'Criminal Law', 'Disorderly Conduct WA | Hammond Legal', 'Facing a charge? Learn the penalties.'],
  ['About Us', '', 'About Us | Hammond Legal', 'Meet the team.'],
  ['Our People', 'About Us', 'Our People | Hammond Legal', 'Meet the lawyers.'],
  ['Contact Us', '', 'Contact Us | Hammond Legal', 'Get in touch.'],
])
check(detectKind(clusters) === 'keywords', 'detects keyword clusters')
check(detectKind(sheet) === 'sitemap', 'detects sitemap sheet')
const sample = buildSampleSitemap('smoke')
const plan = buildLandingPlan({
  sitemapRows: parseSitemapSheet(sheet),
  keywordRows: parseKeywordClusters(clusters),
  templates: sample.templates,
})
const byUrl = Object.fromEntries(plan.pages.map(p => [p.url, p]))
check(byUrl['/'] && byUrl['/'].keywords.length === 2 && byUrl['/'].keywords.find(k => k.is_primary).keyword === 'lawyers perth', 'home gets cluster, highest volume is primary (blank category continuation handled)')
check(byUrl['/criminal-law/']?.status === 'keep', 'page with keywords defaults to keep')
check(byUrl['/criminal-law/disorderly-conduct/']?.keywords.length === 2, 'child page nested under parent by sheet parent column')
check(byUrl['/about-us/our-people/']?.status === 'functional', 'page without keywords is functional, URL nests under parent slug')
check(byUrl['/wills-estates/']?.status === 'opportunity' && byUrl['/wills-estates/probate/']?.status === 'opportunity', 'cluster with no sheet page creates parent + page as opportunity')
check(byUrl['/']?.templateId === sample.templates[0].id, 'home gets Home template')
check(byUrl['/criminal-law/disorderly-conduct/']?.templateId === sample.templates[2].id, 'grandchild gets Service Child template')
check(byUrl['/criminal-law/']?.title_tag.startsWith('Criminal Lawyer'), 'title carried from sheet')
if (plan.warnings.length) console.log('  warnings:', plan.warnings)

// ─── 2. Round trip the tool's own exports ───────────────────
console.log('Round trip: own exports re-import with no diff')
const dataCsv = buildSitemapDataCsv(sample)
const kwCsv = buildKeywordClusterCsv(sample)
check(detectKind(dataCsv) === 'sitemap', 'own sitemap export detected as sitemap sheet')
check(detectKind(kwCsv) === 'keywords', 'own keyword export detected as clusters')
const plan2 = buildLandingPlan({
  sitemapRows: parseSitemapSheet(dataCsv),
  keywordRows: parseKeywordClusters(kwCsv),
  templates: sample.templates,
})
check(plan2.pages.length === sample.pages.length, `same page count (${plan2.pages.length})`)
const diff = diffLanding(sample.pages, plan2.pages)
check(diff.added.length === 0, 'no pages added on re-import')
check(diff.matched.length === 0, 'no field or keyword changes on re-import')
if (diff.matched.length) console.log(JSON.stringify(diff.matched.slice(0, 2), null, 1))

// Edited field is preserved in 'fill' mode, replaced in 'replace' mode
const edited = sample.pages.map(p => p.url === '/probate/' || p.url === '/wills-estates/probate/' ? { ...p, title_tag: 'Edited by hand' } : p)
const diff2 = diffLanding(edited, plan2.pages)
const ops = planOperations(diff2, 'fill')
check(ops.pageUpdates.length === 0, 'fill mode never overwrites an edited field')
const ops2 = planOperations(diff2, 'replace')
check(ops2.pageUpdates.length === 1 && ops2.pageUpdates[0].fields.title_tag.startsWith('Probate'), 'replace mode overwrites on explicit choice')

// ─── 3. Review matching ─────────────────────────────────────
console.log('Review matching')
const gscPages = rowsToCsv([
  ['Top pages', 'Clicks', 'Impressions', 'CTR', 'Position'],
  ['https://hammondlegal.com.au/', 186, 4000, '4.6%', 12.4],
  ['https://hammondlegal.com.au/criminal-law/', 62, 1500, '4.1%', 8.2],
  ['https://hammondlegal.com.au/CRIMINAL-LAW', 3, 50, '6%', 9],
  ['https://hammondlegal.com.au/blog/some-post/', 9, 300, '3%', 20],
])
const gscQueries = rowsToCsv([
  ['Top queries', 'Clicks', 'Impressions', 'CTR', 'Position'],
  ['hammond legal', 88, 200, '44%', 1],
  ['lawyers perth', 34, 1200, '2.8%', 12],
  ['criminal lawyer perth', 26, 500, '5%', 8],
  ['random query', 2, 40, '5%', 33],
])
// Ahrefs style: tab separated, UTF-16LE with BOM
const rankRows = [
  ['Keyword', 'Volume', 'Position', 'URL'],
  ['lawyers perth', 2400, 12, 'https://hammondlegal.com.au/'],
  ['criminal lawyer perth', 500, 8, 'https://hammondlegal.com.au/criminal-law/'],
  ['not in cluster', 10, 5, 'https://hammondlegal.com.au/x/'],
  ['probate lawyers perth', 320, '>100', ''],
]
const tsv = rankRows.map(r => r.join('\t')).join('\r\n')
const u16 = new Uint8Array(2 + tsv.length * 2)
u16[0] = 0xff; u16[1] = 0xfe
for (let i = 0; i < tsv.length; i++) { const c = tsv.charCodeAt(i); u16[2 + i * 2] = c & 0xff; u16[3 + i * 2] = c >> 8 }
const rankText = decodeBuffer(u16.buffer)
check(parseCsvRows(rankText).length === 5 && parseCsvRows(rankText)[0].length === 4, 'UTF-16LE tab-separated Ahrefs export decodes and splits')
check(detectKind(gscPages) === 'gsc_pages' && detectKind(gscQueries) === 'gsc_queries' && detectKind(rankText) === 'rankings', 'review file kinds detected')

const snap = buildReviewSnapshot({
  sitemap: sample,
  gscPages: parseGscPages(gscPages),
  gscQueries: parseGscQueries(gscQueries),
  rankings: parseRankings(rankText),
  volumes: parseVolumes(rowsToCsv([['Keyword', 'Volume'], ['lawyers perth', 2900], ['nope', 5]])),
})
const home = sample.pages.find(p => p.url === '/')
const crim = sample.pages.find(p => p.url === '/criminal-law/')
check(snap.pageMetrics[home.id]?.clicks === 186, 'GSC page matched by path')
check(snap.pageMetrics[crim.id]?.clicks === 65, 'URL variants (case, trailing slash) merge into one page')
check(snap.unmatched.pages.length === 1 && snap.unmatched.pages[0].path === '/blog/some-post/', 'unmatched GSC page listed, not dropped')
const homePrimary = home.keywords.find(k => k.is_primary)
check(snap.keywordPositions[homePrimary.id]?.position === 12, 'ranking matched to keyword by exact text')
const probateKw = sample.pages.find(p => p.url === '/wills-estates/probate/').keywords.find(k => k.is_primary)
check(snap.keywordPositions[probateKw.id] && snap.keywordPositions[probateKw.id].position === null, '">100" position stored as not ranking')
check(snap.unmatched.keywords.length === 1, 'unmatched ranking row listed')
const homeQueries = snap.queries.filter(q => q.page_id === home.id)
check(homeQueries.length === 1 && homeQueries[0].query === 'lawyers perth', 'query attributed to page via keyword match')
check(snap.unmatched.queries.length === 2, 'brand + random queries unattributed, kept for review')
const volUpd = snap.volumeUpdates.find(v => v.keyword_id === homePrimary.id)
check(volUpd && volUpd.to === 2900, 'volumes file proposes a change (volumes file wins over rank tracker volume)')
check(snap.volumeUpdates.some(v => v.keyword === 'criminal lawyer perth' && v.to === 500), 'rank tracker volume proposes a change when no volumes row')
check(snap.stats.gsc_pages.matched === 3 && snap.stats.rankings.matched === 3, 'stats count matches')

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
