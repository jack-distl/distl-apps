import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { StatusChip, PositionChip, ChangeIndicator } from './Chips'
import { visualOrderedPages, visualDepthOf, primaryKeyword, supportingKeywords, combinedVolume, templateLabel, formatNumber } from '@/lib/sitemap/tree'
import { pagePerfSummary, hasPerf, pageMetric } from '@/lib/sitemap/perf'
import { cn } from '@/lib/utils'

const INDENT = ['', 'pl-7', 'pl-12', 'pl-16']

export function TableView({ sitemap, version, selectedPageId, onSelectPage }) {
  const isReview = version?.type === 'review'
  // Reading order follows the board: home, then each column left to right, functional last
  const { ordered, hierarchy } = visualOrderedPages(sitemap.pages)
  const tplById = new Map(sitemap.templates.map(t => [t.id, t]))

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Page</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Primary keyword</TableHead>
            <TableHead>Supporting keywords</TableHead>
            {isReview ? (
              <>
                <TableHead className="text-right">Position</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Imp.</TableHead>
              </>
            ) : (
              <>
                <TableHead className="text-right">Volume /mo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Template</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map(p => {
            const depth = Math.min(visualDepthOf(hierarchy, p), 3)
            const primary = primaryKeyword(p)
            const supp = supportingKeywords(p)
            const perf = isReview && hasPerf(version, p) ? pagePerfSummary(sitemap, version, p) : null
            const selected = p.id === selectedPageId
            return (
              <TableRow
                key={p.id}
                data-state={selected ? 'selected' : undefined}
                onClick={() => onSelectPage(p.id)}
                className={cn('cursor-pointer', p.status === 'functional' && 'text-gray-500')}
              >
                <TableCell className={cn('font-medium text-charcoal whitespace-nowrap', INDENT[depth])}>{p.name}</TableCell>
                <TableCell className="font-mono text-xs text-gray-500">{p.url}</TableCell>
                <TableCell className="text-charcoal">{primary ? primary.keyword : <span className="text-gray-300 italic">no keyword focus</span>}</TableCell>
                <TableCell className="text-xs text-gray-500 max-w-xs">{supp.map(k => k.keyword).join(', ')}</TableCell>
                {isReview ? (
                  <>
                    <TableCell className="text-right">{perf && primary ? <PositionChip position={perf.position} /> : <span className="text-gray-300">—</span>}</TableCell>
                    <TableCell className="text-right">{perf && primary && <ChangeIndicator change={perf.positionChange} />}</TableCell>
                    <TableCell className="text-right tabular-nums">{perf ? formatNumber(perf.clicks) : <span className="text-gray-300">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums text-gray-500">{perf && pageMetric(version, p.id) ? formatNumber(pageMetric(version, p.id).impressions) : <span className="text-gray-300">—</span>}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-right tabular-nums">{primary ? formatNumber(combinedVolume(p)) : <span className="text-gray-300">—</span>}</TableCell>
                    <TableCell><StatusChip status={p.status} /></TableCell>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">{templateLabel(tplById.get(p.template_id)) || <span className="text-gray-300">—</span>}</TableCell>
                  </>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
