// CSV helpers for the Sitemap Tool.
//
// Parsing is tolerant on purpose: exports from Ahrefs default to UTF-16 with
// a byte-order mark and tab separators, SEMrush and Search Console are UTF-8
// comma files, and hand-made sheets can be either. We sniff all of that.

// ─── Decoding ────────────────────────────────────────────────

/** Decode a File / ArrayBuffer / string into text, handling UTF-16 BOMs. */
export async function readFileText(file) {
  if (typeof file === 'string') return stripBom(file)
  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer()
  return decodeBuffer(buf)
}

export function decodeBuffer(buf) {
  const bytes = new Uint8Array(buf)
  if (bytes.length >= 2) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      return stripBom(new TextDecoder('utf-16le').decode(buf))
    }
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      return stripBom(new TextDecoder('utf-16be').decode(buf))
    }
  }
  // Heuristic: lots of null bytes in even positions = UTF-16LE without BOM
  if (bytes.length >= 8) {
    let nulls = 0
    const sample = Math.min(bytes.length, 400)
    for (let i = 1; i < sample; i += 2) if (bytes[i] === 0) nulls++
    if (nulls > sample / 4) return stripBom(new TextDecoder('utf-16le').decode(buf))
  }
  return stripBom(new TextDecoder('utf-8').decode(buf))
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

// ─── Parsing ─────────────────────────────────────────────────

/** Pick the delimiter that yields the most consistent column count. */
export function sniffDelimiter(text) {
  const firstLines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 5)
  const candidates = [',', '\t', ';']
  let best = ','
  let bestScore = -1
  for (const d of candidates) {
    const counts = firstLines.map(l => l.split(d).length)
    if (!counts.length) continue
    const min = Math.min(...counts)
    const max = Math.max(...counts)
    // prefer delimiters that split into >1 columns consistently
    const score = min > 1 && min === max ? min * 10 : min > 1 ? min : 0
    if (score > bestScore) { bestScore = score; best = d }
  }
  return best
}

/** RFC 4180 parser. Returns array of row arrays (strings). */
export function parseCsvRows(text, delimiter = sniffDelimiter(text)) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0
  const n = text.length

  while (i < n) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += ch; i++; continue
    }
    if (ch === '"') { inQuotes = true; i++; continue }
    if (ch === delimiter) { row.push(field); field = ''; i++; continue }
    if (ch === '\r') { i++; continue }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
    field += ch; i++
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }

  // Drop fully empty trailing rows
  while (rows.length && rows[rows.length - 1].every(c => c.trim() === '')) rows.pop()
  return rows
}

/**
 * Parse CSV text into { headers, rows } where each row is an object keyed
 * by the normalised header (lowercase, trimmed) and also by the raw header.
 */
export function parseCsvObjects(text) {
  const rows = parseCsvRows(text)
  if (!rows.length) return { headers: [], rows: [] }
  const headers = rows[0].map(h => h.trim())
  const keys = headers.map(normaliseHeader)
  const out = []
  for (const r of rows.slice(1)) {
    if (r.every(c => c.trim() === '')) continue
    const obj = {}
    keys.forEach((k, idx) => { obj[k] = (r[idx] ?? '').trim() })
    out.push(obj)
  }
  return { headers, keys, rows: out }
}

export function normaliseHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/[\s_\-()]+/g, ' ').trim()
}

/** Find the first key in `row` matching any of the candidate header names. */
export function pickColumn(keys, candidates) {
  for (const c of candidates) {
    const hit = keys.find(k => k === c)
    if (hit) return hit
  }
  for (const c of candidates) {
    const hit = keys.find(k => k.includes(c))
    if (hit) return hit
  }
  return null
}

export function toInt(v) {
  if (v == null) return 0
  const s = String(v).replace(/[^0-9.\-]/g, '')
  if (!s) return 0
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n) : 0
}

export function toNumber(v) {
  if (v == null || v === '') return null
  const s = String(v).replace(/[^0-9.\-]/g, '')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// ─── Writing ─────────────────────────────────────────────────

export function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

/** Rows (arrays) → CSV text. LF line endings, trailing newline. */
export function rowsToCsv(rows) {
  return rows.map(r => r.map(csvCell).join(',')).join('\n') + '\n'
}

/** Trigger a browser download of text content. */
export function downloadText(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
