import { RefreshCw, X } from 'lucide-react'
import { Dot } from './Chips'
import { KIND_LABELS } from '@/lib/sitemap/importers'

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

export function SourceStrip({ version, onReplace, onDeleteUpload }) {
  const uploads = version?.uploads || []
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs text-gray-500">
      {uploads.length === 0 && <span className="italic text-gray-400">No files recorded for this review.</span>}
      {uploads.map(u => (
        <span key={u.id} className="group inline-flex items-center gap-1.5">
          <Dot variant={u.matched_count > 0 ? 'success' : 'default'} />
          <b className="font-medium text-gray-700">{KIND_LABELS[u.kind] || u.kind}</b>
          <span className="text-gray-400">— {u.filename}, {fmtDate(u.uploaded_at)} · {u.matched_count}/{u.row_count} rows matched</span>
          <button type="button" onClick={() => onDeleteUpload(u.id)} title="Remove this upload record" className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
        </span>
      ))}
      <button type="button" onClick={onReplace} className="ml-auto inline-flex items-center gap-1 text-coral hover:text-coral-dark font-medium">
        <RefreshCw size={12} /> Replace files
      </button>
    </div>
  )
}
