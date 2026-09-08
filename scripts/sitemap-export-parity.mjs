// Parity test for the WordPress export.
//
//   node scripts/sitemap-export-parity.mjs
//
// 1. Round-trips the reference file: parse Example - Sitemap Import.csv into
//    a sitemap, export it, and require a byte-identical result.
// 2. Runs the sample (Hammond Legal) tree through the exporter and checks the
//    structural rules: header, three blocks in order, root numbering shared by
//    home and top-level pages, children restarting at 1, functional pages last.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parseWordPressCsv, buildWordPressRows, buildWordPressCsv, WP_HEADERS } from '../src/lib/sitemap/wordpressExport.js'
import { buildSampleSitemap } from '../src/lib/sitemap/sampleData.js'
import { isHome } from '../src/lib/sitemap/tree.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const examplePath = path.join(here, '..', 'reference', 'seo-foundations', 'Example - Sitemap Import.csv')
const example = readFileSync(examplePath, 'utf8')

let failures = 0
function check(cond, msg) {
  if (cond) console.log(`  ok   ${msg}`)
  else { failures++; console.log(`  FAIL ${msg}`) }
}

// ─── 1. Round trip ──────────────────────────────────────────
console.log('Round trip: Example - Sitemap Import.csv')
const parsed = parseWordPressCsv(example)
const sitemap = {
  menus: parsed.menus,
  templates: parsed.templates.map((t, i) => ({ ...t, id: `tpl-${i}` })),
  pages: parsed.pages.map((p, i) => ({
    ...p,
    id: `page-${i}`,
    template_id: p.templateRef ? `tpl-${parsed.templates.findIndex(t => t.code === p.templateRef)}` : null,
  })),
}
const out = buildWordPressCsv(sitemap)
check(out === example, 'export is byte-identical to the reference file')
if (out !== example) {
  const a = example.split('\n'), b = out.split('\n')
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) console.log(`    line ${i + 1}\n      expected: ${JSON.stringify(a[i])}\n      actual:   ${JSON.stringify(b[i])}`)
  }
}

// ─── 2. Structural rules on the sample tree ──────────────────
console.log('Structure: sample tree')
const sample = buildSampleSitemap('sample-client')
const rows = buildWordPressRows(sample)
check(rows[0].join(',') === WP_HEADERS.join(','), 'header row matches')

const types = rows.slice(1).map(r => r[6])
const firstTpl = types.indexOf('template')
const firstPage = types.findIndex(t => t === 'page' || t === 'post')
check(types.slice(0, firstTpl).every(t => t === 'menu'), 'menus block first')
check(types.slice(firstTpl, firstPage).every(t => t === 'template'), 'templates block second')
check(types.slice(firstPage).every(t => t === 'page' || t === 'post'), 'pages block last')

const menuRows = rows.slice(1, 1 + sample.menus.length)
check(menuRows.every((r, i) => r[5] === i + 1 && r[1] === '' && r[2] === ''), 'menu_uid = 1..n on menu rows')
const tplRows = rows.slice(1 + sample.menus.length, firstPage + 1)
check(tplRows.length === sample.templates.length && tplRows.every((r, i) => r[5] === i + 1), 'template rows numbered 1..n')

const pageRows = rows.slice(firstPage + 1)
const home = pageRows.find(r => r[2] === '')
check(home && home[1] === '' && home[5] === 1, 'home has blank slug, blank parent, menu_uid 1')
const roots = pageRows.filter(r => r[1] === '')
check(roots.map(r => r[5]).join(',') === roots.map((_, i) => i + 1).join(','), 'home + top-level pages share root numbering 1..n')
const byParent = new Map()
for (const r of pageRows) {
  if (!r[1]) continue
  if (!byParent.has(r[1])) byParent.set(r[1], [])
  byParent.get(r[1]).push(r[5])
}
check([...byParent.values()].every(list => list.join(',') === list.map((_, i) => i + 1).join(',')), 'children restart at 1 under each parent')
check(pageRows.every(r => r[4] === ''), 'menu column blank on page rows')
check(pageRows.every(r => Number.isInteger(r[3]) && r[3] >= 1 && r[3] <= sample.templates.length), 'every page references a valid template number')
const functionalNames = sample.pages.filter(p => p.status === 'functional').map(p => p.name)
const lastN = pageRows.slice(-functionalNames.length).map(r => r[0])
check(functionalNames.every(n => lastN.includes(n)), 'functional pages are last')
const ourPeople = pageRows.find(r => r[0] === 'Our People')
check(ourPeople && ourPeople[1] === 'About Us', 'parent derived from URL path (/about/our-people/ → About Us)')
const homeRow = pageRows.find(r => isHome({ url: '/' }) && r[0] === 'Home')
check(homeRow && homeRow[3] === 1, 'home uses template 1')

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
