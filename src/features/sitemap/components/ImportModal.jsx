import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Loader2, Globe, FileSpreadsheet } from 'lucide-react'
import { Modal } from '@/components'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileDrop } from './FileDrop'
import { StatusChip } from './Chips'
import { readFileText } from '@/lib/sitemap/csv'
import { detectKind, parseKeywordClusters, parseSitemapSheet } from '@/lib/sitemap/importers'
import { parseWordPressCsv } from '@/lib/sitemap/wordpressExport'
import { parseSitemapXml, looksLikeSitemapXml } from '@/lib/sitemap/sitemapXml'
import { pathSections, urlsToSitemapRows, originFromInput } from '@/lib/sitemap/discovery'
import { buildLandingPlan, diffLanding, planOperations } from '@/lib/sitemap/landing'
import { cn } from '@/lib/utils'

const FIELD_LABELS = { name: 'Name', status: 'Status', title_tag: 'Title tag', meta_description: 'Meta description', h1: 'H1', post_type: 'Post type', template_id: 'Template' }

const SLOTS = [
  { key: 'sitemap', label: 'Proposed sitemap', description: 'Page | Parent | Title | Meta Description. A WordPress import CSV or an XML sitemap file also work here. Extra columns (URL, Status, Template, H1) are picked up when present.', accept: '.csv,.tsv,.txt,.xml' },
  { key: 'keywords', label: 'Keyword clusters', description: 'Category | Keywords | Search Volume, one row per keyword. "Parent > Page" categories nest. Pages named here but missing from the sitemap are created as opportunities.' },
  { key: 'metadata', label: 'Metadata sheet', description: 'Page (or URL) | Title | Meta Description | H1. Only needed if metadata lives in a separate file.', optional: true },
]

const MODES = [
  { value: 'add', label: 'Add new pages and keywords only', hint: 'Existing pages are left exactly as they are.' },
  { value: 'fill', label: 'Add new, and fill in blank fields', hint: 'Recommended. Edits you have made are never overwritten.' },
  { value: 'replace', label: 'Add new, and replace changed fields', hint: 'The files win over what is currently in the tool.' },
]

/**
 * Landing. Three sources, any combination:
 *   - the live website's XML sitemap (fetched server-side) or an uploaded sitemap.xml
 *   - the SEO Foundations CSVs (sitemap sheet, keyword clusters, metadata)
 *   - a WordPress import CSV
 * Discovered URLs go through a "choose sections" step, then everything
 * merges into one landing plan and is diffed against the current tree.
 */
export function ImportModal({ open, onClose, sitemap, onApply, initialFocus }) {
  const [files, setFiles] = useState({})
  const [site, setSite] = useState('')
  const [fetching, setFetching] = useState(false)
  const [discovered, setDiscovered] = useState(null) // { source, urls: [paths], sitemaps }
  const [excluded, setExcluded] = useState(new Set())
  const [postSections, setPostSections] = useState(new Set())
  const [step, setStep] = useState('files')
  const [mode, setMode] = useState('fill')
  const [plan, setPlan] = useState(null)
  const [diff, setDiff] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setFiles({}); setSite(sitemap?.domain || ''); setDiscovered(null); setExcluded(new Set()); setPostSections(new Set())
    setStep('files'); setMode('fill'); setPlan(null); setDiff(null); setError(null)
  }, [open, sitemap?.domain])

  function setDiscoveredUrls(source, urls, sitemaps = []) {
    const paths = urls.map(u => (typeof u === 'string' ? u : u.loc))
    const sections = pathSections(paths)
    setDiscovered({ source, urls: paths, sitemaps })
    setExcluded(new Set())
    setPostSections(new Set(sections.filter(s => s.suggestPost).map(s => s.key)))
  }

  async function fetchSite() {
    const origin = originFromInput(site)
    if (!origin) return setError('Enter the website address, e.g. example.com.au')
    setError(null)
    setFetching(true)
    try {
      const res = await window.fetch(`/api/sitemap/fetch?url=${encodeURIComponent(site.trim())}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Could not fetch the sitemap (${res.status})`)
      if (!data.urls?.length) throw new Error('The sitemap was found but contained no URLs')
      setDiscoveredUrls(`${data.origin} (${data.sitemaps.length} sitemap file${data.sitemaps.length === 1 ? '' : 's'})`, data.urls, data.sitemaps)
    } catch (err) {
      setError(err.message || 'Could not fetch the sitemap')
    } finally {
      setFetching(false)
    }
  }

  async function handleFile(slot, file) {
    setFiles(f => ({ ...f, [slot]: { busy: true, name: file.name } }))
    try {
      const text = await readFileText(file)
      if (slot === 'sitemap' && (looksLikeSitemapXml(text) || /\.xml$/i.test(file.name))) {
        const { urls, sitemaps } = parseSitemapXml(text)
        if (!urls.length && sitemaps.length) throw new Error('This is a sitemap index. Upload one of the sitemaps it lists, or use "Fetch" with the website address.')
        if (!urls.length) throw new Error('No URLs found in this XML file')
        setDiscoveredUrls(file.name, urls)
        setFiles(f => { const n = { ...f }; delete n[slot]; return n })
        return
      }
      const kind = detectKind(text)
      let parsed
      let summary
      if (slot === 'sitemap') {
        if (kind === 'wordpress') { parsed = { wordpress: parseWordPressCsv(text) }; summary = `${parsed.wordpress.pages.length} pages, ${parsed.wordpress.templates.length} templates (WordPress format)` }
        else { const rows = parseSitemapSheet(text); parsed = { sitemapRows: rows }; summary = `${rows.length} pages` }
      } else if (slot === 'keywords') {
        const rows = parseKeywordClusters(text)
        parsed = { keywordRows: rows }
        summary = `${rows.length} keywords in ${new Set(rows.map(r => r.category)).size} clusters`
      } else {
        const rows = parseSitemapSheet(text)
        parsed = { metadataRows: rows }
        summary = `${rows.length} rows`
      }
      if (kind && kind !== 'wordpress' && kind !== slot && !(slot === 'metadata' && kind === 'sitemap') && !(slot === 'sitemap' && kind === 'metadata')) {
        summary += ` · looks like a ${kind.replace('_', ' ')} file`
      }
      setFiles(f => ({ ...f, [slot]: { name: file.name, summary, parsed } }))
    } catch (err) {
      setFiles(f => ({ ...f, [slot]: { name: file.name, error: err.message || 'Could not read this file' } }))
    }
  }

  const sections = useMemo(() => (discovered ? pathSections(discovered.urls) : []), [discovered])
  const discoveredRows = useMemo(() => (discovered ? urlsToSitemapRows(discovered.urls, { excludedSections: excluded, postSections }) : []), [discovered, excluded, postSections])
  const ready = Object.values(files).some(f => f?.parsed) || discoveredRows.length > 0

  function preview() {
    setError(null)
    try {
      const merged = {}
      for (const f of Object.values(files)) if (f?.parsed) Object.assign(merged, f.parsed)
      // Discovered URLs are plain sitemap rows; any sheet rows are appended so they can enrich them
      if (discoveredRows.length) merged.sitemapRows = [...discoveredRows, ...(merged.sitemapRows || [])]
      const p = buildLandingPlan({ ...merged, templates: sitemap.templates })
      setPlan(p)
      setDiff(diffLanding(sitemap.pages, p.pages))
      setStep('preview')
    } catch (err) {
      setError(err.message || 'Could not build the import preview')
    }
  }

  async function apply() {
    setBusy(true)
    try {
      await onApply(planOperations(diff, mode))
      onClose()
    } catch (err) {
      setError(err.message || 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  function toggle(setter, key) {
    setter(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  const changedCount = diff ? diff.matched.reduce((s, m) => s + m.changes.length, 0) : 0
  const newKwCount = diff ? diff.matched.reduce((s, m) => s + m.newKeywords.length, 0) : 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'files' ? 'Import sitemap' : 'Review import'}
      description={step === 'files'
        ? 'Start from the live website, the SEO Foundations files, or both. The tree lands filled in and everything stays editable.'
        : 'Nothing is overwritten unless you choose it below.'}
    >
      {step === 'files' ? (
        <div className="space-y-4">
          {/* Live website */}
          <div className="rounded-xl border border-gray-200 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-charcoal"><Globe size={15} className="text-coral" /> From the live website</div>
            <div className="flex gap-2">
              <Input
                value={site}
                onChange={e => setSite(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), fetchSite())}
                placeholder="example.com.au or a sitemap.xml URL"
                autoFocus={initialFocus === 'site'}
              />
              <Button type="button" variant="secondary" onClick={fetchSite} disabled={fetching || !site.trim()}>
                {fetching ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null} Fetch
              </Button>
            </div>
            {discovered && (
              <div className="rounded-lg bg-green-50/60 border border-green-200 p-3 text-xs space-y-2">
                <div className="text-green-800"><b>{discovered.urls.length} URLs</b> found in {discovered.source}. Choose what to bring in:</div>
                <ul className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {sections.map(s => {
                    const kept = urlsToSitemapRows(discovered.urls.filter(u => {
                      const segs = u.replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean)
                      return (segs.length <= 1 ? '' : segs[0]) === s.key
                    }), {}).length
                    if (kept === 0) return null
                    return (
                      <li key={s.key} className="flex items-center gap-2">
                        <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                          <input type="checkbox" checked={!excluded.has(s.key)} onChange={() => toggle(setExcluded, s.key)} className="accent-[#E8806A]" />
                          <span className="font-mono text-gray-700 truncate">{s.label}</span>
                          <span className="text-gray-400 shrink-0">{kept}{kept !== s.count ? ` of ${s.count}` : ''} page{s.count === 1 ? '' : 's'}</span>
                        </label>
                        {s.key !== '' && !excluded.has(s.key) && (
                          <label className={cn('flex items-center gap-1 text-[10px] uppercase tracking-wider cursor-pointer shrink-0', postSections.has(s.key) ? 'text-charcoal' : 'text-gray-400')}>
                            <input type="checkbox" checked={postSections.has(s.key)} onChange={() => toggle(setPostSections, s.key)} className="accent-[#E8806A]" /> posts
                          </label>
                        )}
                      </li>
                    )
                  })}
                </ul>
                <div className="text-gray-500">Assets, tag and category archives, pagination and date archives are skipped automatically. Names come from the URL slug and can be edited afterwards.</div>
              </div>
            )}
          </div>

          {/* Files */}
          <div className="rounded-xl border border-gray-200 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-charcoal"><FileSpreadsheet size={15} className="text-coral" /> From files</div>
            {SLOTS.map(s => (
              <FileDrop
                key={s.key}
                label={s.label}
                description={s.description}
                optional={s.optional}
                accept={s.accept}
                busy={files[s.key]?.busy}
                file={files[s.key]?.parsed ? files[s.key] : null}
                error={files[s.key]?.error}
                onFile={file => handleFile(s.key, file)}
                onClear={() => setFiles(f => { const n = { ...f }; delete n[s.key]; return n })}
              />
            ))}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={preview} disabled={!ready}>Preview import</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat n={diff.added.length} label="pages to add" />
            <Stat n={diff.matched.length} label="existing pages touched" />
            <Stat n={newKwCount} label="keywords to add" />
          </div>

          {sitemap.pages.length > 0 && (
            <fieldset className="space-y-1.5">
              {MODES.map(m => (
                <label key={m.value} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer ${mode === m.value ? 'border-coral bg-coral-50/40' : 'border-gray-200'}`}>
                  <input type="radio" name="mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="mt-0.5 accent-[#E8806A]" />
                  <span>
                    <span className="text-sm text-charcoal">{m.label}</span>
                    <span className="block text-xs text-gray-500">{m.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
            {diff.added.map(p => (
              <div key={p.url} className="flex items-center gap-2 px-3 py-1.5 min-w-0">
                <StatusChip status={p.status} />
                <span className="font-medium text-charcoal truncate">{p.name}</span>
                <span className="font-mono text-[11px] text-gray-400 truncate">{p.url}</span>
                <span className="ml-auto text-xs text-gray-400 shrink-0">{p.keywords.length} kw</span>
              </div>
            ))}
            {diff.matched.map(m => (
              <div key={m.existing.id} className="px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-charcoal">{m.existing.name}</span>
                  <span className="font-mono text-[11px] text-gray-400 truncate">{m.existing.url}</span>
                  {m.newKeywords.length > 0 && <span className="ml-auto text-xs text-green-600">+{m.newKeywords.length} kw</span>}
                </div>
                {m.changes.map(c => (
                  <div key={c.field} className="text-xs text-gray-500 mt-0.5 pl-2 break-words">
                    <span className="text-gray-400">{FIELD_LABELS[c.field] || c.field}:</span>{' '}
                    <span className={c.blank ? 'text-gray-300 italic' : 'line-through text-gray-400'}>{c.blank ? 'blank' : String(c.from)}</span>
                    {' → '}<span className="text-charcoal">{String(c.to)}</span>
                    {!c.blank && mode !== 'replace' && <span className="text-gray-300"> (kept)</span>}
                  </div>
                ))}
              </div>
            ))}
            {diff.added.length === 0 && diff.matched.length === 0 && (
              <div className="px-3 py-6 text-center text-gray-400 text-sm">Nothing new in these files. The tree already matches.</div>
            )}
          </div>

          {plan.warnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 space-y-0.5">
              {plan.warnings.slice(0, 8).map((w, i) => <div key={i}>{w}</div>)}
              {plan.warnings.length > 8 && <div>… and {plan.warnings.length - 8} more</div>}
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={() => setStep('files')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-charcoal"><ArrowLeft size={14} /> Back</button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={apply} disabled={busy || (diff.added.length === 0 && changedCount === 0 && newKwCount === 0)}>
                {busy && <Loader2 size={14} className="animate-spin mr-1.5" />} Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Stat({ n, label }) {
  return (
    <div className="rounded-lg bg-gray-50 py-2">
      <div className="text-xl font-semibold text-charcoal tabular-nums">{n}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  )
}
