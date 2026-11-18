import { useMemo, useState } from 'react'
import { Upload } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { parseCopyBrief } from '@/lib/sitemap/copyBrief'
import { countWords } from '@/lib/sitemap/templateBlocks'

const LABEL = { new: 'New', changed: 'Changed', same: 'Unchanged', empty: 'Left empty' }

/**
 * Bring a filled-in copywriting brief back in. Reads the copy between each
 * section's markers, shows what will change, and only writes sections with
 * new or changed copy. Empty slots never wipe existing copy.
 */
export function CopyImportModal({ open, onClose, sitemap, onApply }) {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const parsed = useMemo(() => (text ? parseCopyBrief(text, sitemap) : null), [text, sitemap])
  const toApply = parsed ? parsed.items.filter(i => i.change === 'new' || i.change === 'changed') : []
  const counts = parsed ? parsed.items.reduce((c, i) => ({ ...c, [i.change]: (c[i.change] || 0) + 1 }), {}) : {}
  const pages = new Set(toApply.map(i => i.pageId)).size

  function reset() { setText(''); setFileName('') }
  function close() { reset(); onClose() }

  async function readFile(file) {
    if (!file) return
    setFileName(file.name)
    setText(await file.text())
  }

  return (
    <Modal open={open} onClose={close} title="Import copywriting brief" description="Bring back a brief exported from here once the copy is written. Copy between each section's markers goes into the Copywriting tab.">
      <div className="space-y-3">
        <label
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); readFile(e.dataTransfer.files?.[0]) }}
          className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 px-4 py-5 text-center hover:border-coral/60"
        >
          <Upload size={18} className="text-gray-400" />
          <span className="text-sm text-charcoal">{fileName || 'Drop the .md file here, or click to choose'}</span>
          <span className="text-xs text-gray-400">Or paste it below, e.g. straight from Claude</span>
          <input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" className="hidden" onChange={e => readFile(e.target.files?.[0])} />
        </label>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setFileName('') }}
          placeholder="Paste the filled-in brief"
          rows={4}
          className="w-full resize-y rounded-md border border-gray-200 px-2.5 py-2 font-mono text-[11px] text-gray-700 focus:border-coral/50 focus:outline-none"
        />

        {parsed && (
          parsed.items.length === 0 ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No copy slots found. The file needs the <code>&lt;!-- copy … --&gt;</code> and <code>&lt;!-- /copy --&gt;</code> lines from the export, left exactly as they were.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-600">
                <b className="text-charcoal">{toApply.length}</b> section{toApply.length === 1 ? '' : 's'} to update across <b className="text-charcoal">{pages}</b> page{pages === 1 ? '' : 's'}
                {['same', 'empty'].filter(k => counts[k]).map(k => <span key={k} className="text-gray-400"> · {counts[k]} {LABEL[k].toLowerCase()}</span>)}
                {parsed.unknown > 0 && <span className="text-amber-700"> · {parsed.unknown} for pages or sections no longer in the sitemap, skipped</span>}
              </p>
              {toApply.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-md border border-gray-100">
                  {toApply.map(i => (
                    <div key={i.pageId + i.sectionId} className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-1.5 text-xs last:border-0">
                      <span className="min-w-0 truncate"><b className="font-medium text-charcoal">{i.page.name}</b> <span className="text-gray-400">·</span> {i.sectionTitle}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums text-gray-400">{countWords(i.body)} words</span>
                        <span className={cn('rounded-full px-1.5 py-px text-[10px] font-medium', i.change === 'new' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800')}>{LABEL[i.change]}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button disabled={!toApply.length} onClick={() => { onApply(toApply); close() }}>
            Import {toApply.length || ''} section{toApply.length === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
