// XML sitemap parsing, shared by the browser (uploaded sitemap.xml) and the
// serverless fetcher (api/sitemap/fetch.js).

import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, trimValues: true })

function asArray(v) {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

/**
 * Parse sitemap XML text. Returns { urls: [{ loc, lastmod }], sitemaps: [loc] }.
 * Handles <urlset> and <sitemapindex>. Anything else yields empty arrays.
 */
export function parseSitemapXml(text) {
  let doc
  try {
    doc = parser.parse(String(text || ''))
  } catch {
    return { urls: [], sitemaps: [] }
  }
  const urls = asArray(doc?.urlset?.url)
    .map(u => (typeof u === 'string' ? { loc: u } : { loc: u?.loc, lastmod: u?.lastmod || null }))
    .filter(u => u.loc && typeof u.loc === 'string')
    .map(u => ({ loc: u.loc.trim(), lastmod: u.lastmod ? String(u.lastmod) : null }))
  const sitemaps = asArray(doc?.sitemapindex?.sitemap)
    .map(s => (typeof s === 'string' ? s : s?.loc))
    .filter(s => s && typeof s === 'string')
    .map(s => s.trim())
  return { urls, sitemaps }
}

export function looksLikeSitemapXml(text) {
  const head = String(text || '').slice(0, 2000)
  return /<urlset[\s>]|<sitemapindex[\s>]/i.test(head)
}
