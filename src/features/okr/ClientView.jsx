import { useEffect, useMemo, useState } from 'react'
import { Flag } from 'lucide-react'
import { Tag } from '../../components'
import { Report, ReportCover, ReportPage, ReportStats, ReportTable, ReportList, ReportNote, ReportEnd, Kicker, TD } from '../../components/report'
import { PeriodPills, periodOrder } from '../../components/PeriodPills'
import { SCOPE_OPTIONS } from '../../lib/taskLibrary'
import { getPeriodLabel, calculatePeriodMonths } from '../../lib/constants'
import { fetchClientSitemap } from '../../hooks/useSitemapData'
import { buildClientOverview } from '../../lib/clientOverview'
import { formatNumber } from '../../lib/sitemap/tree'
import { cn } from '../../lib/utils'
import { ChangeIndicator, PositionChip } from '../sitemap/components/Chips'

const changeTone = change => (!change || change.kind === 'none' || change.kind === 'flat' ? 'neutral' : change.kind === 'down' ? 'bad' : 'good')

/** "▲ 1,234 against the review before" as a stat's sub line. */
function ChangeLine({ change, fallback = null }) {
  if (!change || change.kind === 'none') return fallback
  return <span className="inline-flex flex-wrap items-baseline gap-x-1"><ChangeIndicator change={change} className="whitespace-nowrap" /> <span>against the review before</span></span>
}

/**
 * The SEO plan as the client reads it: a landscape report with the period's
 * goal, the search numbers for the months it covers (from the Sitemap's
 * review), the objectives and their tasks, and the pages that moved. Only
 * periods the team has shared reach it.
 */
export default function ClientView({
  clientId,
  clientName,
  period,
  allPeriods = [],
  goal,
  objectives,
  periods,
  selectedPeriodId,
  onPeriodChange,
  sitemapPages,
}) {
  // Named pages an objective covers: the sitemap pages it links, falling back
  // to the free-text scope detail when there are none.
  const pageName = id => (sitemapPages || []).find(p => p.id === id)?.name
  const linkedNames = obj => (obj.linkedPageIds || []).map(pageName).filter(Boolean)
  const periodLabel = period ? getPeriodLabel(period.startMonth, period.startYear, period.endMonth, period.endYear) : ''
  const months = period ? calculatePeriodMonths(period.startMonth, period.startYear, period.endMonth, period.endYear) : 0

  const actioned = objectives.filter(o => o.isActioned !== false)
  const parked = objectives.filter(o => o.isActioned === false)
  const totalTasks = objectives.reduce((sum, obj) => sum + obj.keyResults.length, 0)
  const pagesCovered = new Set(objectives.flatMap(o => o.linkedPageIds || [])).size

  // What the work moved: the Sitemap review whose months overlap this period
  const [sitemap, setSitemap] = useState(null)
  useEffect(() => {
    let live = true
    if (clientId) fetchClientSitemap(clientId).then(sm => { if (live) setSitemap(sm) })
    return () => { live = false }
  }, [clientId])
  const review = useMemo(() => {
    if (!sitemap || !period) return null
    const { reviews } = buildClientOverview(sitemap, allPeriods)
    return [...reviews].reverse().find(r => r.okrPeriods.some(p => p.id === period.id)) || null
  }, [sitemap, period, allPeriods])

  const moved = review ? [...review.improved, ...review.declined] : []
  const stats = review ? [
    { label: 'Search clicks', value: formatNumber(review.all.clicks), sub: <ChangeLine change={review.all.clicksChange} fallback="Search Console, whole site" />, tone: changeTone(review.all.clicksChange) },
    { label: 'Times seen on Google', value: formatNumber(review.all.impressions), sub: <ChangeLine change={review.all.impressionsChange} />, tone: changeTone(review.all.impressionsChange) },
    { label: 'Average Google ranking', value: review.all.avgPosition ?? '—', sub: <ChangeLine change={review.all.avgPositionChange} fallback={`${review.all.rankedCount} keywords tracked`} />, tone: changeTone(review.all.avgPositionChange) },
    { label: 'Pages improved', value: review.improved.length, sub: review.declined.length ? `${review.declined.length} declined` : 'none declined', tone: review.declined.length ? 'neutral' : 'good' },
  ] : [
    { label: 'Objectives', value: objectives.length, sub: parked.length ? `${actioned.length} being worked on · ${parked.length} parked` : 'all being worked on', tone: 'pink' },
    { label: 'Tasks', value: totalTasks, sub: `across ${objectives.length} objective${objectives.length === 1 ? '' : 's'}` },
    { label: 'Pages covered', value: pagesCovered || '—', sub: pagesCovered ? 'pages the work is aimed at' : 'site-wide work' },
    { label: 'Months', value: months, sub: periodLabel },
  ]

  const pills = [...periods].sort((a, b) => periodOrder(a) - periodOrder(b)).map(p => ({ id: p.id, label: getPeriodLabel(p.startMonth, p.startYear, p.endMonth, p.endYear) }))

  return (
    <Report>
      <PeriodPills label="Period" periods={pills} value={selectedPeriodId} onChange={onPeriodChange} />
      <ReportCover
        kicker="Prepared by Distl · SEO plan"
        title={clientName}
        period={periodLabel}
        description={review ? `The objectives and tasks for ${periodLabel}, and what the search numbers did over the same months.` : `The objectives and tasks for ${periodLabel}. The search numbers follow once the period has been reviewed.`}
        aside={goal ? (
          <div>
            <Kicker tone="white" className="mb-2">The goal for this period</Kicker>
            <p className="text-xl font-light leading-snug text-white md:text-2xl">{goal}</p>
          </div>
        ) : null}
      />

      <ReportPage
        kicker="Key outcomes"
        title={review ? `What ${periodLabel} delivered` : 'The period at a glance'}
        intro={review ? `Search results for ${review.label}, against the review before it.` : null}
      >
        <ReportStats items={stats} />
        {review && (
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            <ReportList kicker="What we set out to do" items={actioned.map(o => o.title)} empty="No objectives were set for these months." />
            <ReportList
              kicker="Pages that gained the most"
              items={review.improved.slice(0, 5)}
              empty="Nothing to compare against the previous review yet."
              renderItem={m => (
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate">{m.page.name}</span>
                  <span className="flex shrink-0 items-center gap-2"><PositionChip position={m.avgPosition} /><ChangeIndicator change={m.change} /></span>
                </span>
              )}
            />
          </div>
        )}
      </ReportPage>

      <ReportPage
        kicker="Objectives and tasks"
        title={objectives.length ? 'What we are working on' : 'Nothing planned yet'}
        intro={objectives.length ? `${actioned.length} objective${actioned.length === 1 ? '' : 's'} and ${totalTasks} task${totalTasks === 1 ? '' : 's'} for ${periodLabel}.${parked.length ? ` ${parked.length} ${parked.length === 1 ? 'objective is' : 'objectives are'} parked for now.` : ''}` : 'The objectives for this period are being drafted.'}
      >
        {objectives.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {objectives.map(obj => {
              const scope = SCOPE_OPTIONS.find(s => s.id === obj.scope)
              const isActioned = obj.isActioned !== false
              const names = linkedNames(obj)
              const detail = (obj.scopeDetail || '').trim()
              const where = [names.join(', '), detail].filter(Boolean).join(' · ')
              return (
                <div key={obj.id} className={cn('flex flex-col rounded-2xl border border-sage-line bg-white p-5', !isActioned && 'opacity-70')}>
                  <div className="flex flex-wrap items-center gap-1.5"><Tag tone="soft" size="xs">{scope?.label || obj.scope}</Tag>{!isActioned && <Tag tone="soft" size="xs">Parked</Tag>}</div>
                  <h3 className="mt-2.5 text-lg font-medium leading-snug text-ink">{obj.title}</h3>
                  {where && <p className="mt-1 text-sm text-pink">{where}</p>}
                  {!isActioned && obj.notActionedReason && <p className="mt-1.5 text-xs text-ink-faint">{obj.notActionedReason}</p>}
                  {obj.keyResults.length === 0 ? (
                    <p className="mt-4 text-sm text-ink-faint">Tasks to follow.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-sage-line border-t border-sage-line">
                      {obj.keyResults.map(kr => (
                        <li key={kr.id} className="flex items-start gap-2.5 py-2.5">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-line" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-sm leading-relaxed text-ink">{kr.task}</p>
                            {kr.description && <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">{kr.description}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ReportPage>

      {review && moved.length > 0 && (
        <ReportPage
          kicker={`Search results · ${review.label}`}
          title="The pages that moved"
          intro="Average Google ranking across each page's tracked keywords, compared with the previous review. Pages in the sections we have flagged as priorities carry a flag."
        >
          <ReportTable head={[{ label: 'Page' }, { label: 'Position', align: 'right' }, { label: 'Change', align: 'right' }]}>
            {moved.slice(0, 15).map(m => (
              <tr key={m.page.id}>
                <td className={TD}><span className="inline-flex items-center gap-2">{m.isPriority && <Flag size={11} className="shrink-0 text-pink" fill="currentColor" />}{m.page.name}</span></td>
                <td className={cn(TD, 'text-right')}><PositionChip position={m.avgPosition} /></td>
                <td className={cn(TD, 'text-right')}><ChangeIndicator change={m.change} /></td>
              </tr>
            ))}
          </ReportTable>
          {moved.length > 15 && <p className="mt-3 text-xs text-ink-faint">And {moved.length - 15} more. The Results tab has every review.</p>}
          {review.priorityHubs.length > 0 && (
            <ReportNote className="mt-6" lead="Priority sections.">{review.priorityHubs.map(h => h.name).join(', ')}.</ReportNote>
          )}
        </ReportPage>
      )}

      <ReportEnd />
    </Report>
  )
}
