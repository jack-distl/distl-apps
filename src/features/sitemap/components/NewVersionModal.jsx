import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Modal } from '@/components'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileDrop } from './FileDrop'
import { readFileText } from '@/lib/sitemap/csv'
import { detectKind, parseGscPages, parseGscQueries, parseRankings, parseVolumes, KIND_LABELS } from '@/lib/sitemap/importers'
import { buildReviewSnapshot } from '@/lib/sitemap/matching'
import { planAdditionsFromUploads, augmentSitemapForPreview } from '@/lib/sitemap/discovery'
import { formatNumber } from '@/lib/sitemap/tree'
import { periodLabel, defaultReviewPeriod } from '@/lib/sitemap/perf'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const SLOTS = [
  { key: 'gsc_pages', label: 'Search Console — Pages', description: 'GSC → Performance → Export → Pages.csv. Clicks and impressions per URL for the review period.', parse: parseGscPages, summary: r => `${r.length} pages` },
  { key: 'gsc_queries', label: 'Search Console — Queries', description: 'Queries.csv from the same export. Matched to pages through the keyword clusters; the rest rolls into an anonymous row per page.', parse: parseGscQueries, summary: r => `${r.length} queries` },
  { key: 'rankings', label: 'Rank tracking export', description: 'Ahrefs Rank Tracker or SEMrush Position Tracking. Keyword, position, ranking URL. Ahrefs UTF-16 exports are fine.', parse: parseRankings, summary: r => `${r.length} keywords` },
  { key: 'volumes', label: 'Refreshed volumes', description: 'Keyword | Volume. If skipped, volumes from the rank tracker (when present) or the original research carry forward.', parse: parseVolumes, summary: r => `${r.length} keywords`, optional: true },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function MonthPicker({ value, onChange }) {
  const [y, m] = (value || '').split('-').map(Number)
  const years = []
  const thisYear = new Date().getFullYear()
  for (let yy = thisYear + 1; yy >= thisYear - 6; yy--) years.push(yy)
  const set = (yy, mm) => onChange(`${yy}-${String(mm).padStart(2, '0')}-01`)
  return (
    <div className="flex gap-1.5">
      <Select value={String(m || '')} onValueChange={v => set(y || thisYear, Number(v))}>
        <SelectTrigger className="h-8 w-[5.5rem] text-xs"><SelectValue placeholder="Month" /></SelectTrigger>
        <SelectContent>{MONTHS.map((name, i) => <SelectItem key={name} value={String(i + 1)}>{name}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={String(y || '')} onValueChange={v => set(Number(v), m || 1)}>
        <SelectTrigger className="h-8 w-[5.5rem] text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
        <SelectContent>{years.map(yy => <SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  )
}

/**
 * Creates (or replaces the data of) a review version from uploaded exports.
 * The files can also grow the sitemap: pages and keywords they reveal are
 * offered as additions before matching, so the tool works for a client with
 * no SEO Foundations tree at all.
 *
 * onConfirm({ name, rows, additions, volumeUpdates, uploadsMeta }) is handled by
 * the parent, which applies additions first and then matches against the grown tree.
 */
export function NewVersionModal({ open, onClose, sitemap, existingVersion, userName, onConfirm }) {
  const [name, setName] = useState('')
  const [nameEdited, setNameEdited] = useState(false)
  const [period, setPeriod] = useState(defaultReviewPeriod())
  const [files, setFiles] = useState({})
  const [step, setStep] = useState('files')
  const [pickedPages, setPickedPages] = useState(new Set())      // page urls to add
  const [pickedKeywords, setPickedKeywords] = useState(new Set()) // `${pageUrl}|${keyword}` to add
  const [showAllPages, setShowAllPages] = useState(false)
  const [showAllKeywords, setShowAllKeywords] = useState(false)
  const [applyVolumes, setApplyVolumes] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    const p = existingVersion?.period_start ? { period_start: existingVersion.period_start, period_end: existingVersion.period_end || existingVersion.period_start } : defaultReviewPeriod()
    setPeriod(p)
    setName(existingVersion ? existingVersion.name : periodLabel(p.period_start, p.period_end))
    setNameEdited(!!existingVersion)
    setFiles({}); setStep('files'); setApplyVolumes(true); setError(null); setShowAllPages(false); setShowAllKeywords(false)
  }, [open, existingVersion, sitemap])

  // The version is named after its period until the name is edited by hand
  useEffect(() => { if (!nameEdited) setName(periodLabel(period.period_start, period.period_end)) }, [period, nameEdited])

  async function handleFile(slot, file) {
    const def = SLOTS.find(s => s.key === slot)
    setFiles(f => ({ ...f, [slot]: { busy: true, name: file.name } }))
    try {
      const text = await readFileText(file)
      const rows = def.parse(text)
      const kind = detectKind(text)
      let summary = def.summary(rows)
      if (kind && kind !== slot) summary += ` · looks like a ${KIND_LABELS[kind] || kind} file`
      setFiles(f => ({ ...f, [slot]: { name: file.name, summary, rows } }))
    } catch (err) {
      setFiles(f => ({ ...f, [slot]: { name: file.name, error: err.message || 'Could not read this file' } }))
    }
  }

  const rows = useMemo(() => ({
    gscPages: files.gsc_pages?.rows || [],
    gscQueries: files.gsc_queries?.rows || [],
    rankings: files.rankings?.rows || [],
    volumes: files.volumes?.rows || [],
  }), [files])

  const hasFiles = Object.values(files).some(f => f?.rows)
  const ready = name.trim() && (hasFiles || !!existingVersion)

  // Preview: additions the files reveal, then the snapshot against the (optionally grown) tree
  const additions = useMemo(() => (step === 'preview' ? planAdditionsFromUploads(sitemap, rows) : null), [step, sitemap, rows])

  // Every keyword the files could add, flattened: new pages' clusters plus keywords for existing pages
  const keywordCandidates = useMemo(() => {
    if (!additions) return []
    const byId = new Map((sitemap.pages || []).map(p => [p.id, p]))
    const list = []
    for (const p of additions.pageInserts) for (const k of p.keywords) list.push({ key: `${p.url}|${k.keyword}`, keyword: k.keyword, volume: k.volume, pageUrl: p.url, pageName: p.name, newPage: true })
    for (const k of additions.keywordInserts) { const pg = byId.get(k.pageId); list.push({ key: `${pg?.url}|${k.keyword}`, keyword: k.keyword, volume: k.volume, pageUrl: pg?.url, pageName: pg?.name, newPage: false, pageId: k.pageId }) }
    return list.sort((a, b) => (b.volume || 0) - (a.volume || 0))
  }, [additions, sitemap.pages])

  const sitemapHasKeywords = (sitemap.pages || []).some(p => p.keywords?.length)
  useEffect(() => {
    if (!additions) return
    // Pages default to ticked. Keywords default to ticked only when nothing is tracked yet,
    // so a re-upload never grows the tracked list unless you choose it.
    setPickedPages(new Set(additions.pageInserts.map(p => p.url)))
    setPickedKeywords(new Set(sitemapHasKeywords ? [] : keywordCandidates.map(k => k.key)))
  }, [additions]) // eslint-disable-line react-hooks/exhaustive-deps

  // Additions narrowed to what is ticked. Keywords on an unticked new page cannot be added.
  const chosenAdditions = useMemo(() => {
    if (!additions) return null
    const pageInserts = additions.pageInserts
      .filter(p => pickedPages.has(p.url))
      .map(p => ({ ...p, keywords: p.keywords.filter(k => pickedKeywords.has(`${p.url}|${k.keyword}`)).map((k, i, arr) => ({ ...k, is_primary: k.is_primary && arr.some(x => x.is_primary) ? k.is_primary : false })) }))
    // Re-pick a primary for new pages whose primary was unticked
    for (const p of pageInserts) {
      if (p.keywords.length && !p.keywords.some(k => k.is_primary)) {
        const top = p.keywords.reduce((b, k) => (b == null || k.volume > b.volume ? k : b), null)
        top.is_primary = true
      }
    }
    const byId = new Map((sitemap.pages || []).map(pg => [pg.id, pg]))
    const keywordInserts = additions.keywordInserts.filter(k => pickedKeywords.has(`${byId.get(k.pageId)?.url}|${k.keyword}`))
    return { pageInserts, keywordInserts, counts: { pages: pageInserts.length, keywords: keywordInserts.length + pageInserts.reduce((s, p) => s + p.keywords.length, 0) } }
  }, [additions, pickedPages, pickedKeywords, sitemap.pages])

  const previewSitemap = useMemo(() => {
    if (!chosenAdditions) return sitemap
    return augmentSitemapForPreview(sitemap, chosenAdditions)
  }, [sitemap, chosenAdditions])
  const snapshot = useMemo(() => (step === 'preview' ? buildReviewSnapshot({ sitemap: previewSitemap, ...rows }) : null), [step, previewSitemap, rows])

  const uploadsMeta = useMemo(() => {
    if (!snapshot) return []
    return SLOTS.filter(s => files[s.key]?.rows).map(s => {
      const unmatchedKey = { gsc_pages: 'pages', gsc_queries: 'queries', rankings: 'keywords', volumes: 'volumes' }[s.key]
      return {
        kind: s.key,
        filename: files[s.key].name,
        uploaded_by: userName || null,
        row_count: snapshot.stats[s.key].rows,
        matched_count: snapshot.stats[s.key].matched,
        unmatched: (snapshot.unmatched[unmatchedKey] || []).slice(0, 500),
      }
    })
  }, [snapshot, files, userName])

  // Hand the work to the parent and close straight away: the sitemap updates
  // locally at once and the row writes finish behind the save indicator.
  function confirm() {
    setError(null)
    onConfirm({
      name: name.trim(),
      period_start: period.period_start,
      period_end: period.period_end,
      rows,
      additions: chosenAdditions,
      applyVolumes,
      uploadsMeta,
      existingVersionId: existingVersion?.id || null,
      hasFiles,
    })
    onClose()
  }

  const hasAdditions = additions && (additions.counts.pages > 0 || additions.counts.keywords > 0)
  const toggleIn = (setter) => (key) => setter(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const togglePage = toggleIn(setPickedPages)
  const toggleKeyword = toggleIn(setPickedKeywords)
  const PAGE_LIMIT = 8
  const KW_LIMIT = 10

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existingVersion ? `Replace files for "${existingVersion.name}"` : 'New version'}
      description={step === 'files'
        ? 'A version layers performance data over the same sitemap so the plan can be reviewed against reality. Upload the exports and the tool does the matching.'
        : 'Check the matching before the version is created. Nothing unmatched is dropped; it is kept with the version for review.'}
    >
      {step === 'files' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Period covered · from</label>
              <MonthPicker value={period.period_start} onChange={v => setPeriod(p => ({ ...p, period_start: v, period_end: p.period_end < v ? v : p.period_end }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">to</label>
              <MonthPicker value={period.period_end} onChange={v => setPeriod(p => ({ ...p, period_end: v, period_start: p.period_start > v ? v : p.period_start }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Version name</label>
            <Input value={name} onChange={e => { setName(e.target.value); setNameEdited(true) }} placeholder="e.g. Jul – Sep 2026" />
            <p className="text-[11px] text-gray-400 mt-1">Named after the period it covers. Change it if you like; the period stays on the version either way.</p>
          </div>
          {SLOTS.map(s => (
            <FileDrop
              key={s.key}
              label={s.label}
              description={s.description}
              optional={s.optional}
              busy={files[s.key]?.busy}
              file={files[s.key]?.rows ? files[s.key] : null}
              error={files[s.key]?.error}
              onFile={file => handleFile(s.key, file)}
              onClear={() => setFiles(f => { const n = { ...f }; delete n[s.key]; return n })}
            />
          ))}
          <p className="text-[11px] text-gray-400 leading-relaxed">
            <b className="text-gray-500">How matching works:</b> GSC page rows match pages by URL path. Ranking rows match keywords by exact text. Query clicks GSC does not attribute roll into an anonymous row per page, so page totals always reconcile with the pages export. Pages and keywords the files reveal that the sitemap does not have yet are offered as additions on the next step.
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            {existingVersion && !hasFiles ? (
              <Button onClick={confirm} disabled={!ready}>Save name and period</Button>
            ) : (
              <Button onClick={() => { setError(null); setStep('preview') }} disabled={!ready}>Match files</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {hasAdditions && (
            <div className="rounded-lg border border-coral/40 bg-coral-50/30 p-3 space-y-3">
              <div className="flex items-center gap-1.5 text-sm text-charcoal">
                <Sparkles size={14} className="text-coral" />
                <span className="font-medium">These files mention things the sitemap does not have yet.</span>
              </div>
              <p className="text-xs text-gray-500 -mt-2">Tick what to add. Nothing already in the sitemap changes. Everything added is editable afterwards.</p>

              {additions.pageInserts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="accent-[#E8806A]" checked={pickedPages.size === additions.pageInserts.length} ref={el => { if (el) el.indeterminate = pickedPages.size > 0 && pickedPages.size < additions.pageInserts.length }} onChange={e => setPickedPages(new Set(e.target.checked ? additions.pageInserts.map(p => p.url) : []))} />
                      <span className="font-medium text-charcoal">Newly discovered pages</span>
                      <span className="text-gray-400">{pickedPages.size} of {additions.pageInserts.length} selected</span>
                    </label>
                    <span className="text-gray-400">from Search Console URLs and ranking URLs</span>
                  </div>
                  <ul className="rounded-md border border-gray-200 bg-white divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {(showAllPages ? additions.pageInserts : additions.pageInserts.slice(0, PAGE_LIMIT)).map(p => (
                      <li key={p.url}>
                        <label className="flex items-center gap-2 px-2.5 py-1 text-xs cursor-pointer hover:bg-gray-50">
                          <input type="checkbox" className="accent-[#E8806A]" checked={pickedPages.has(p.url)} onChange={() => togglePage(p.url)} />
                          <span className={pickedPages.has(p.url) ? 'text-charcoal' : 'text-gray-400'}>{p.name}</span>
                          <span className="font-mono text-[11px] text-gray-400 truncate">{p.url}</span>
                          {p.keywords.length > 0 && <span className="ml-auto text-[11px] text-gray-400 shrink-0">{p.keywords.length} kw</span>}
                        </label>
                      </li>
                    ))}
                  </ul>
                  {additions.pageInserts.length > PAGE_LIMIT && (
                    <button type="button" onClick={() => setShowAllPages(v => !v)} className="mt-1 text-xs text-coral hover:text-coral-dark">
                      {showAllPages ? 'Show fewer' : `See all ${additions.pageInserts.length} pages`}
                    </button>
                  )}
                </div>
              )}

              {keywordCandidates.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="accent-[#E8806A]" checked={pickedKeywords.size === keywordCandidates.length} ref={el => { if (el) el.indeterminate = pickedKeywords.size > 0 && pickedKeywords.size < keywordCandidates.length }} onChange={e => setPickedKeywords(new Set(e.target.checked ? keywordCandidates.map(k => k.key) : []))} />
                      <span className="font-medium text-charcoal">Newly discovered ranking keywords</span>
                      <span className="text-gray-400">{pickedKeywords.size} of {keywordCandidates.length} selected</span>
                    </label>
                    <span className="text-gray-400">{sitemapHasKeywords ? 'Unticked by default so tracking only grows when you say so' : 'Ticked because nothing is tracked yet'}</span>
                  </div>
                  <ul className="rounded-md border border-gray-200 bg-white divide-y divide-gray-100 max-h-56 overflow-y-auto">
                    {(showAllKeywords ? keywordCandidates : keywordCandidates.slice(0, KW_LIMIT)).map(k => {
                      const pageOff = k.newPage && !pickedPages.has(k.pageUrl)
                      return (
                        <li key={k.key}>
                          <label className={`flex items-center gap-2 px-2.5 py-1 text-xs ${pageOff ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`} title={pageOff ? 'Tick its page above first' : ''}>
                            <input type="checkbox" className="accent-[#E8806A]" disabled={pageOff} checked={pickedKeywords.has(k.key) && !pageOff} onChange={() => toggleKeyword(k.key)} />
                            <span className={pickedKeywords.has(k.key) && !pageOff ? 'text-charcoal' : 'text-gray-400'}>{k.keyword}</span>
                            <span className="text-[11px] text-gray-400 tabular-nums">{formatNumber(k.volume)}</span>
                            <span className="ml-auto text-[11px] text-gray-400 truncate">→ {k.pageName}{k.newPage ? ' (new)' : ''}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                  {keywordCandidates.length > KW_LIMIT && (
                    <button type="button" onClick={() => setShowAllKeywords(v => !v)} className="mt-1 text-xs text-coral hover:text-coral-dark">
                      {showAllKeywords ? 'Show fewer' : `See all ${keywordCandidates.length} keywords`}
                    </button>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-500">
                Adding <b className="text-charcoal">{chosenAdditions.counts.pages}</b> page{chosenAdditions.counts.pages === 1 ? '' : 's'} and <b className="text-charcoal">{chosenAdditions.counts.keywords}</b> keyword{chosenAdditions.counts.keywords === 1 ? '' : 's'}. Anything left unticked stays listed under unmatched below and is kept with the version.
              </div>
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-400">
                <th className="text-left font-semibold pb-1">File</th>
                <th className="text-right font-semibold pb-1">Rows</th>
                <th className="text-right font-semibold pb-1">Matched</th>
                <th className="text-right font-semibold pb-1">Unmatched</th>
              </tr>
            </thead>
            <tbody>
              {uploadsMeta.map(u => (
                <tr key={u.kind} className="border-t border-gray-100">
                  <td className="py-1.5 min-w-0"><span className="font-medium text-charcoal">{KIND_LABELS[u.kind]}</span> <span className="text-xs text-gray-400 break-all">{u.filename}</span></td>
                  <td className="py-1.5 text-right tabular-nums">{formatNumber(u.row_count)}</td>
                  <td className="py-1.5 text-right tabular-nums text-green-700">{formatNumber(u.matched_count)}</td>
                  <td className={`py-1.5 text-right tabular-nums ${u.row_count - u.matched_count ? 'text-amber-600' : 'text-gray-300'}`}>{formatNumber(u.row_count - u.matched_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <UnmatchedList title="Search Console pages with no matching sitemap page" rows={snapshot.unmatched.pages} render={r => <><span className="font-mono">{r.path}</span> · {r.clicks} clicks</>} />
          <UnmatchedList title="Ranking keywords not in any cluster" rows={snapshot.unmatched.keywords} render={r => <>{r.keyword} · {r.position == null ? 'not ranking' : `#${r.position}`}{r.url ? <span className="text-gray-400"> · {r.url}</span> : ''}</>} />
          <UnmatchedList title="Queries not attributed to a page (counted in anonymous clicks)" rows={snapshot.unmatched.queries} render={r => <>{r.query} · {r.clicks} clicks</>} />

          {snapshot.volumeUpdates.length > 0 && (
            <label className="flex items-start gap-2.5 rounded-lg border border-gray-200 px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={applyVolumes} onChange={e => setApplyVolumes(e.target.checked)} className="mt-0.5 accent-[#E8806A]" />
              <span>
                <span className="text-sm text-charcoal">Refresh search volumes for {snapshot.volumeUpdates.length} keyword{snapshot.volumeUpdates.length === 1 ? '' : 's'}</span>
                <span className="block text-xs text-gray-500">Updates the planning volumes to the figures in these files. Untick to keep the original research numbers.</span>
              </span>
            </label>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={() => setStep('files')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-charcoal"><ArrowLeft size={14} /> Back</button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={confirm}>
                {existingVersion ? 'Replace data' : 'Create version'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function UnmatchedList({ title, rows, render }) {
  if (!rows?.length) return null
  return (
    <details className="rounded-lg border border-amber-200 bg-amber-50/40 text-xs min-w-0">
      <summary className="cursor-pointer px-3 py-2 text-amber-800 font-medium">{title} ({rows.length})</summary>
      <ul className="max-h-40 overflow-y-auto px-3 pb-2 space-y-0.5 text-gray-600 break-all">
        {rows.slice(0, 200).map((r, i) => <li key={i}>{render(r)}</li>)}
        {rows.length > 200 && <li className="text-gray-400">… and {rows.length - 200} more</li>}
      </ul>
    </details>
  )
}
