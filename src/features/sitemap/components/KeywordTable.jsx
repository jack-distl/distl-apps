import { useState } from 'react'
import { Star, X, Plus } from 'lucide-react'
import { EditableText } from './Editable'
import { PositionChip, ChangeIndicator } from './Chips'
import { combinedVolume, formatNumber } from '@/lib/sitemap/tree'
import { keywordPosition, previousReview, change } from '@/lib/sitemap/perf'
import { cn } from '@/lib/utils'

/**
 * The keyword cluster for one page. Fully editable: rename, change volume,
 * star a new primary, remove, add. On review versions it also shows position
 * and change per keyword.
 */
export function KeywordTable({ sitemap, version, page, onAdd, onUpdate, onSetPrimary, onDelete }) {
  const isReview = version?.type === 'review'
  const prev = isReview ? previousReview(sitemap, version) : null
  const [newKw, setNewKw] = useState('')
  const [newVol, setNewVol] = useState('')
  const keywords = [...(page.keywords || [])].sort((a, b) => (b.is_primary - a.is_primary) || (a.sort_order - b.sort_order))

  function submitNew(e) {
    e.preventDefault()
    if (!newKw.trim()) return
    onAdd(page.id, { keyword: newKw, volume: Number(newVol) || 0 })
    setNewKw('')
    setNewVol('')
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-400">
            <th className="text-left font-semibold pb-1.5 pl-6">Keyword</th>
            <th className="text-right font-semibold pb-1.5">Volume</th>
            {isReview && <th className="text-right font-semibold pb-1.5">Position</th>}
            {isReview && <th className="text-right font-semibold pb-1.5">Change</th>}
            <th className="w-6" />
          </tr>
        </thead>
        <tbody>
          {keywords.map(k => {
            const pos = isReview ? keywordPosition(version, k.id) : null
            const prevPos = prev ? keywordPosition(prev, k.id) : null
            return (
              <tr key={k.id} className={cn('group border-t border-gray-100', k.is_primary && 'font-medium text-charcoal')}>
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => !k.is_primary && onSetPrimary(page.id, k.id)}
                      title={k.is_primary ? 'Primary keyword' : 'Make primary'}
                      className={cn('shrink-0 transition-colors', k.is_primary ? 'text-coral' : 'text-gray-200 hover:text-coral')}
                    >
                      <Star size={13} fill={k.is_primary ? 'currentColor' : 'none'} />
                    </button>
                    <EditableText value={k.keyword} onChange={v => v && onUpdate(k.id, { keyword: v.toLowerCase() })} className="min-w-0" />
                  </div>
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  <EditableText type="number" value={k.volume} onChange={v => onUpdate(k.id, { volume: Math.max(0, Number(v) || 0) })} inputClassName="w-20 text-right" />
                </td>
                {isReview && <td className="py-1.5 text-right"><PositionChip position={pos} /></td>}
                {isReview && <td className="py-1.5 text-right"><ChangeIndicator change={change(pos, prevPos, { betterWhenLower: true })} /></td>}
                <td className="py-1.5 text-right">
                  <button type="button" onClick={() => onDelete(k.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove keyword">
                    <X size={13} />
                  </button>
                </td>
              </tr>
            )
          })}
          {keywords.length > 0 && (
            <tr className="border-t border-gray-200 text-xs text-gray-500">
              <td className="pt-1.5 pl-6">Combined monthly volume</td>
              <td className="pt-1.5 text-right font-semibold text-charcoal tabular-nums">{formatNumber(combinedVolume(page))}</td>
              {isReview && <td colSpan={2} />}
              <td />
            </tr>
          )}
        </tbody>
      </table>
      <form onSubmit={submitNew} className="flex items-center gap-2 mt-2 pl-6">
        <input
          value={newKw}
          onChange={e => setNewKw(e.target.value)}
          placeholder="Add keyword"
          className="flex-1 min-w-0 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-coral/30"
        />
        <input
          type="number"
          min="0"
          value={newVol}
          onChange={e => setNewVol(e.target.value)}
          placeholder="Vol"
          className="w-16 rounded-md border border-gray-200 px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-coral/30"
        />
        <button type="submit" disabled={!newKw.trim()} className="text-coral disabled:text-gray-300" title="Add keyword"><Plus size={16} /></button>
      </form>
    </div>
  )
}
