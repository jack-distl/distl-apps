import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Modal } from '@/components'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileDrop } from './FileDrop'
import { readFileText } from '@/lib/sitemap/csv'
import { detectKind, parseGscPages, parseGscQueries, parseRankings, parseVolumes, KIND_LABELS } from '@/lib/sitemap/importers'
import { buildReviewSnapshot } from '@/lib/sitemap/matching'
import { formatNumber } from '@/lib/sitemap/tree'

const SLOTS = [
  { key: 'gsc_pages', label: 'Search Console — Pages', description: 'GSC → Performance → Export → Pages.csv. Clicks and impressions per URL for the review period.', parse: parseGscPages, summary: r => `${r.length} pages` },
  { key: 'gsc_queries', label: 'Search Console — Queries', description: 'Queries.csv from the same export. Matched to pages through the keyword clusters; the rest rolls into an anonymous row per page.', parse: parseGscQueries, summary: r => `${r.length} queries` },
  { key: 'rankings', label: 'Rank tracking export', description: 'Ahrefs Rank Tracker or SEMrush Position Tracking. Keyword, position, ranking URL. Ahrefs UTF-16 exports are fine.', parse: parseRankings, summary: r => `${r.length} keywords` },
  { key: 'volumes', label: 'Refreshed volumes', description: 'Keyword | Volume. If skipped, volumes from the rank tracker (when present) or the original research carry forward.', parse: parseVolumes, summary: r => `${r.length} keywords`, optional: true },
]

function suggestName(sitemap) {
  const reviews = (sitemap.versions || []).filter(v => v.type === 'review').length
  return ['6 Month Review', '1 Year Review', '18 Month Review', '2 Year Review'][reviews] || `Review ${reviews + 1}`
}

export function NewVersionModal({ open, onClose, sitemap, existingVersion, userName, onCreate, onReplace }) {
  const [name, setName] = useState('')
  const [files, setFiles] = useState({})
  const [step, setStep] = useState('files')
  const [snapshot, setSnapshot] = useState(null)
  const [applyVolumes, setApplyVolumes] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setName(existingVersion ? existingVersion.name : suggestName(sitemap))
    setFiles({}); setStep('files'); setSnapshot(null); setApplyVolumes(true); setError(null)
  }, [open, existingVersion, sitemap])

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

  const ready = name.trim() && Object.values(files).some(f => f?.rows)

  function preview() {
    setError(null)
    try {
      const snap = buildReviewSnapshot({
        sitemap,
        gscPages: files.gsc_pages?.rows || [],
        gscQueries: files.gsc_queries?.rows || [],
        rankings: files.rankings?.rows || [],
        volumes: files.volumes?.rows || [],
      })
      setSnapshot(snap)
      setStep('preview')
    } catch (err) {
      setError(err.message || 'Could not match the files')
    }
  }

  const uploads = useMemo(() => {
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

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      const payload = { name: name.trim(), snapshot, uploads, volumeUpdates: applyVolumes ? snapshot.volumeUpdates : [] }
      if (existingVersion) await onReplace(existingVersion.id, payload)
      else await onCreate(payload)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not create the version')
    } finally {
      setBusy(false)
    }
  }

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
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Version name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 6 Month Review" />
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
            <b className="text-gray-500">How matching works:</b> GSC page rows match pages by URL path. Ranking rows match keywords by exact text. Query clicks GSC does not attribute roll into an anonymous row per page, so page totals always reconcile with the pages export.
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={preview} disabled={!ready}>Match files</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
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
              {uploads.map(u => (
                <tr key={u.kind} className="border-t border-gray-100">
                  <td className="py-1.5"><span className="font-medium text-charcoal">{KIND_LABELS[u.kind]}</span> <span className="text-xs text-gray-400">{u.filename}</span></td>
                  <td className="py-1.5 text-right tabular-nums">{formatNumber(u.row_count)}</td>
                  <td className="py-1.5 text-right tabular-nums text-green-700">{formatNumber(u.matched_count)}</td>
                  <td className={`py-1.5 text-right tabular-nums ${u.row_count - u.matched_count ? 'text-amber-600' : 'text-gray-300'}`}>{formatNumber(u.row_count - u.matched_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <UnmatchedList title="Search Console pages with no matching sitemap page" rows={snapshot.unmatched.pages} render={r => <><span className="font-mono">{r.path}</span> · {r.clicks} clicks</>} />
          <UnmatchedList title="Ranking keywords not in any cluster" rows={snapshot.unmatched.keywords} render={r => <>{r.keyword} · {r.position == null ? 'not ranking' : `#${r.position}`}</>} />
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
              <Button onClick={confirm} disabled={busy}>
                {busy && <Loader2 size={14} className="animate-spin mr-1.5" />}
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
    <details className="rounded-lg border border-amber-200 bg-amber-50/40 text-xs">
      <summary className="cursor-pointer px-3 py-2 text-amber-800 font-medium">{title} ({rows.length})</summary>
      <ul className="max-h-40 overflow-y-auto px-3 pb-2 space-y-0.5 text-gray-600">
        {rows.slice(0, 200).map((r, i) => <li key={i}>{render(r)}</li>)}
        {rows.length > 200 && <li className="text-gray-400">… and {rows.length - 200} more</li>}
      </ul>
    </details>
  )
}
