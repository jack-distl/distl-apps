// GET /api/sitemap/fetch?url=example.com
// Discovers and reads a website's XML sitemap(s) server-side (browsers cannot
// fetch other origins directly). Follows sitemap indexes, returns a flat URL
// list. Read-only; nothing is stored.

import { parseSitemapXml } from '../../src/lib/sitemap/sitemapXml.js'

const MAX_SITEMAPS = 60
const MAX_URLS = 8000
const FETCH_TIMEOUT_MS = 12000
const CANDIDATES = ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml', '/sitemap/sitemap.xml', '/sitemap-index.xml', '/page-sitemap.xml']

function toOrigin(input) {
  let s = String(input || '').trim()
  if (!s) return null
  if (!/^[a-z]+:\/\//i.test(s)) s = 'https://' + s
  try {
    const u = new URL(s)
    if (!/^https?:$/.test(u.protocol)) return null
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1)/.test(u.hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname)) return null
    return u
  } catch {
    return null
  }
}

async function fetchText(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; DistlSitemapTool/1.0; +https://distl.com.au)', accept: 'application/xml,text/xml,text/plain,*/*' },
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function sitemapsFromRobots(origin) {
  const txt = await fetchText(origin + '/robots.txt')
  if (!txt) return []
  return txt.split(/\r?\n/)
    .map(l => l.match(/^\s*sitemap:\s*(\S+)/i)?.[1])
    .filter(Boolean)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const parsed = toOrigin(req.query.url)
  if (!parsed) return res.status(400).json({ error: 'Give a website address, e.g. example.com.au' })
  const origin = parsed.origin

  try {
    // Starting points: an explicit .xml URL, robots.txt entries, then the usual suspects
    const starts = []
    if (/\.xml(\?.*)?$/i.test(parsed.pathname)) starts.push(parsed.href)
    starts.push(...(await sitemapsFromRobots(origin)))
    for (const c of CANDIDATES) starts.push(origin + c)

    const queue = [...new Set(starts)]
    const fetched = []
    const urls = new Map()
    let truncated = false

    while (queue.length && fetched.length < MAX_SITEMAPS && urls.size < MAX_URLS) {
      const loc = queue.shift()
      if (fetched.includes(loc)) continue
      const text = await fetchText(loc)
      if (!text) continue
      const { urls: found, sitemaps } = parseSitemapXml(text)
      if (!found.length && !sitemaps.length) continue
      fetched.push(loc)
      for (const u of found) {
        if (urls.size >= MAX_URLS) { truncated = true; break }
        if (!urls.has(u.loc)) urls.set(u.loc, u)
      }
      for (const s of sitemaps) if (!fetched.includes(s) && !queue.includes(s)) queue.push(s)
      // Once one sitemap has been found, stop guessing the other generic paths;
      // anything else worth reading is reached through the index it points to.
      if (fetched.length === 1) {
        for (const c of CANDIDATES) { const i = queue.indexOf(origin + c); if (i >= 0 && origin + c !== loc) queue.splice(i, 1) }
      }
    }

    if (!fetched.length) {
      return res.status(404).json({ error: `No XML sitemap found at ${origin}. Try the exact sitemap URL, or upload the file.` })
    }

    res.json({ origin, sitemaps: fetched, urls: [...urls.values()], truncated })
  } catch (err) {
    console.error('Sitemap fetch error:', err)
    res.status(500).json({ error: err.message || 'Could not fetch the sitemap' })
  }
}
