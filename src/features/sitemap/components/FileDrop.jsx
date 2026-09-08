import { useRef, useState } from 'react'
import { Upload, Check, X, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A drop zone for one CSV. `file` is { name, summary } once parsed; `error` a
 * string. `onFile(File)` is called on drop/browse; `onClear()` removes it.
 */
export function FileDrop({ label, description, optional, file, error, busy, onFile, onClear, accept = '.csv,.tsv,.txt' }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  function handleFiles(list) {
    const f = list && list[0]
    if (f) onFile(f)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); handleFiles(e.dataTransfer.files) }}
      onClick={() => !file && inputRef.current?.click()}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3.5 transition-colors',
        file ? 'border-green-200 bg-green-50/40' : error ? 'border-red-200 bg-red-50/40' : 'border-dashed border-gray-300 bg-white hover:border-coral/60 cursor-pointer',
        over && 'border-coral bg-coral-50/60'
      )}
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', file ? 'bg-green-100 text-green-700' : error ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500')}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : file ? <Check size={16} /> : error ? <AlertTriangle size={16} /> : <Upload size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-charcoal">{label}</span>
          {optional && <span className="text-[10px] uppercase tracking-wider text-gray-400 border border-gray-200 rounded px-1">Optional</span>}
        </div>
        {description && !file && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>}
        {file && (
          <p className="text-xs text-green-700 mt-0.5 break-all">
            <span className="font-medium">{file.name}</span>
            {file.summary && <span className="text-green-700/80"> — {file.summary}</span>}
          </p>
        )}
        {error && <p className="text-xs text-red-600 mt-0.5 break-words">{error}</p>}
      </div>
      {file ? (
        <button type="button" onClick={e => { e.stopPropagation(); onClear?.() }} className="text-gray-400 hover:text-gray-600 shrink-0" title="Remove file">
          <X size={14} />
        </button>
      ) : (
        <span className="text-xs font-medium text-coral shrink-0">Browse</span>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
    </div>
  )
}
