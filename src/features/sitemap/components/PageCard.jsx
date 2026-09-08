import { Flag, ChevronDown, ChevronUp, Layers } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StatusChip, PositionChip, ChangeIndicator } from './Chips'
import { primaryKeyword, combinedVolume, formatNumber } from '@/lib/sitemap/tree'
import { pagePerfSummary, hasPerf } from '@/lib/sitemap/perf'
import { cn } from '@/lib/utils'

function short(n) {
  n = Number(n) || 0
  return n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : formatNumber(n)
}

/**
 * One page on the board. `aggregate` (from aggregatePages) turns the card
 * into a roll-up: stats are summed over the pages beneath it and a
 * "N of T pages" line shows that. `onToggleCollapse` adds the roll-up chevron.
 */
export function PageCard({ sitemap, version, page, selected, onSelect, className, aggregate = null, totalPages = 0, collapsed = false, onToggleCollapse }) {
  const isReview = version?.type === 'review'
  const primary = primaryKeyword(page)
  const perf = isReview ? pagePerfSummary(sitemap, version, page) : null
  const showPerf = isReview && hasPerf(version, page)
  const functional = page.status === 'functional'
  const priority = !!page.is_priority

  return (
    <Card
      onClick={() => onSelect?.(page.id)}
      className={cn(
        'p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-px',
        functional && 'border-dashed bg-gray-50/60',
        priority && 'border-coral/50 bg-coral-50/40',
        selected && 'ring-2 ring-coral border-coral shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-charcoal leading-tight truncate flex items-center gap-1.5">
            {priority && <Flag size={11} className="text-coral shrink-0" fill="currentColor" title="Priority" />}
            <span className="truncate">{page.name}</span>
          </div>
          <div className="text-[11px] text-gray-400 font-mono truncate mt-0.5">{page.url}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {showPerf && perf.primary
            ? <PositionChip position={perf.position} />
            : <StatusChip status={page.status} />}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggleCollapse() }}
              title={collapsed ? 'Show the pages beneath' : 'Roll up the pages beneath'}
              className="w-5 h-5 rounded-full text-gray-400 hover:text-coral hover:bg-coral-50 flex items-center justify-center"
            >
              {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>
          )}
        </div>
      </div>

      {aggregate ? (
        <div className="mt-2.5 pt-2 border-t border-gray-100 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Layers size={11} className="text-gray-400" />
            <span className="font-medium">{aggregate.pageCount} of {totalPages} pages</span>
            <span className="text-gray-400">· {aggregate.keywordCount} kw</span>
          </div>
          {isReview ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">{short(aggregate.clicks)} clicks</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">{short(aggregate.impressions)} imp</span>
              <ChangeIndicator change={aggregate.clicksChange} />
              {aggregate.avgPosition != null && <span className="text-[11px] text-gray-400">avg #{aggregate.avgPosition}</span>}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-600 truncate">{primary ? primary.keyword : <span className="text-gray-400 italic">no keyword focus</span>}</span>
              <span className="shrink-0 rounded-full bg-coral-50 px-2 py-0.5 text-[11px] font-medium text-coral-dark tabular-nums">Σ {formatNumber(aggregate.volume)}/mo</span>
            </div>
          )}
        </div>
      ) : isReview ? (
        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-gray-100 text-xs">
          <span className="text-gray-600 truncate inline-flex items-center gap-1.5 min-w-0">
            <span className="truncate">{primary ? primary.keyword : <span className="text-gray-400 italic">no keyword focus</span>}</span>
            {showPerf && primary && <ChangeIndicator change={perf.positionChange} />}
          </span>
          {showPerf && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 tabular-nums">
              {formatNumber(perf.clicks)} clicks
            </span>
          )}
        </div>
      ) : primary ? (
        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-gray-100 text-xs">
          <span className="text-gray-600 truncate">{primary.keyword}</span>
          <span className="shrink-0 rounded-full bg-coral-50 px-2 py-0.5 text-[11px] font-medium text-coral-dark tabular-nums">
            {formatNumber(combinedVolume(page))}/mo
          </span>
        </div>
      ) : null}
    </Card>
  )
}
