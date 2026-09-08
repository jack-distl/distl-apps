import { Card } from '@/components/ui/card'
import { StatusChip, PositionChip, ChangeIndicator } from './Chips'
import { primaryKeyword, combinedVolume, formatNumber } from '@/lib/sitemap/tree'
import { pagePerfSummary, hasPerf } from '@/lib/sitemap/perf'
import { cn } from '@/lib/utils'

export function PageCard({ sitemap, version, page, selected, onSelect, className }) {
  const isReview = version?.type === 'review'
  const primary = primaryKeyword(page)
  const perf = isReview ? pagePerfSummary(sitemap, version, page) : null
  const showPerf = isReview && hasPerf(version, page)
  const functional = page.status === 'functional'

  return (
    <Card
      onClick={() => onSelect?.(page.id)}
      className={cn(
        'p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-px',
        functional && 'border-dashed bg-gray-50/60',
        selected && 'ring-2 ring-coral border-coral shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-charcoal leading-tight truncate">{page.name}</div>
          <div className="text-[11px] text-gray-400 font-mono truncate mt-0.5">{page.url}</div>
        </div>
        {showPerf && perf.primary
          ? <PositionChip position={perf.position} />
          : <StatusChip status={page.status} className="shrink-0" />}
      </div>

      {isReview ? (
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
