import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Target, Map as MapIcon, Flag, TrendingUp, ChevronDown, ChevronUp, Layers, Link2,
} from 'lucide-react'
import { LoadingSpinner, EmptyState, Hint } from '../../components'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table'
import { useClients, useClientRetainers } from '../../hooks'
import { useOkrData } from '../../hooks/useOkrData'
import { fetchClientSitemap } from '../../hooks/useSitemapData'
import { buildClientOverview, okrPeriodLabel } from '../../lib/clientOverview'
import { ChangeIndicator, PositionChip } from '../sitemap/components/Chips'
import { formatNumber } from '../../lib/sitemap/tree'
import { formatCurrency, formatHours } from '../../lib/constants'
import { cn } from '../../lib/utils'

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }

function Stat({ label, value, change, sub, hint }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-semibold text-charcoal tabular-nums leading-none">{value}</div>
        <div className="h-4 mt-1"><ChangeIndicator change={change} /></div>
        <div className="text-xs text-gray-500 mt-0.5 inline-flex items-center gap-1">
          {label}{hint && <Hint size={11}>{hint}</Hint>}
        </div>
        {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
      </CardContent>
    </Card>
  )
}

export default function ClientOverview() {
  const { clientId } = useParams()
  const { clients, loading: clientsLoading } = useClients()
  const client = clients.find(c => c.id === clientId)
  const { retainers } = useClientRetainers(clientId)
  const { periods, loading: okrLoading } = useOkrData(clientId)

  const [sitemap, setSitemap] = useState(undefined) // undefined = loading, null = none
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    let cancelled = false
    setSitemap(undefined)
    fetchClientSitemap(clientId).then(sm => { if (!cancelled) setSitemap(sm) })
    return () => { cancelled = true }
  }, [clientId])

  const overview = useMemo(
    () => (sitemap === undefined ? null : buildClientOverview(sitemap, periods || [])),
    [sitemap, periods]
  )

  if (clientsLoading || okrLoading || sitemap === undefined) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>
  }
  if (!client) {
    return (
      <div className="max-w-2xl">
        <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-coral mb-6"><ArrowLeft size={16} /> Back to Clients</Link>
        <p className="text-gray-500">Client not found.</p>
      </div>
    )
  }

  const { reviews, latest, totals, unmatchedOkr, priorityHubCount } = overview
  const newest = [...reviews].reverse()
  const seoRetainer = retainers?.seo || 0

  return (
    <div className="w-full max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <Link to="/clients" className="text-gray-400 hover:text-gray-600 mt-1.5" title="Back to Clients"><ArrowLeft size={20} /></Link>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Client overview</div>
            <h1 className="text-2xl font-semibold text-charcoal">{client.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-500">
              <span>{client.abbreviation}</span>
              {seoRetainer > 0 && <><span className="text-gray-300">|</span><span>{formatCurrency(seoRetainer)}/mo SEO</span></>}
              {!client.is_active && <Badge>Inactive</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" asChild><Link to={`/okr/${client.id}`}><Target size={15} className="mr-1.5" /> OKR Planner</Link></Button>
          <Button variant="secondary" asChild><Link to={`/sitemap/${client.id}`}><MapIcon size={15} className="mr-1.5" /> Sitemap Tool</Link></Button>
        </div>
      </div>

      {/* Headline: the most recent review */}
      {latest ? (
        <>
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-sm font-semibold text-charcoal">Latest review</h2>
            <span className="text-sm text-gray-500">{latest.label}</span>
            <span className="text-xs text-gray-400">against the review before it</span>
          </div>
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
            <motion.div variants={fadeUp}>
              <Stat
                label="Clicks"
                value={formatNumber(latest.all.clicks)}
                change={latest.all.clicksChange}
                hint="Search Console clicks for the whole site over this review period. Not GA4 sessions."
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <Stat label="Impressions" value={formatNumber(latest.all.impressions)} change={latest.all.impressionsChange} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <Stat
                label="All keywords"
                value={latest.all.avgPosition ?? '—'}
                change={latest.all.avgPositionChange}
                sub={`avg position · ${latest.all.rankedCount} tracked`}
                hint="Average rank across every tracked keyword. The change covers keywords that ranked in both reviews."
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <Stat
                label="Priority keywords"
                value={latest.priority?.avgPosition ?? '—'}
                change={latest.priority?.avgPositionChange}
                sub={latest.priority ? `avg position · ${latest.priority.rankedCount} tracked` : 'no priority hubs flagged'}
                hint="The same average, limited to pages in hubs flagged Priority in the Sitemap Tool."
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <Stat
                label="Pages improved"
                value={latest.improved.length}
                sub={latest.declined.length ? `${latest.declined.length} declined` : 'none declined'}
                hint="Pages whose tracked keywords average a better position than at the previous review."
              />
            </motion.div>
          </motion.div>
        </>
      ) : (
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <div className="w-11 h-11 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-3"><TrendingUp size={20} className="text-coral" /></div>
            <h2 className="text-base font-semibold text-charcoal mb-1">No reviews yet</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
              {overview.hasSitemap
                ? 'Add a review version in the Sitemap Tool with the Search Console and rank tracker exports, and the movement shows up here.'
                : 'Start a sitemap for this client, then add review versions. Work recorded in the OKR Planner still shows below.'}
            </p>
            <Button asChild><Link to={`/sitemap/${client.id}`}><MapIcon size={15} className="mr-1.5" /> Open the Sitemap Tool</Link></Button>
          </CardContent>
        </Card>
      )}

      {/* Every period side by side */}
      {reviews.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-charcoal mb-3 inline-flex items-center gap-1">
            Every review period
            <Hint>Each row is a review version from the Sitemap Tool. Work is the OKR periods whose months overlap that review, so the two line up without being locked together.</Hint>
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">All keywords</TableHead>
                  <TableHead className="text-right">Priority keywords</TableHead>
                  <TableHead className="text-right">Objectives</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                  <TableHead className="text-right">Pages improved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newest.map(r => (
                  <TableRow key={r.version.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-charcoal whitespace-nowrap">
                      {r.label}
                      {r.name !== r.label && <span className="ml-1.5 text-[11px] font-normal text-gray-400">{r.name}</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{formatNumber(r.all.clicks)} <ChangeIndicator change={r.all.clicksChange} className="ml-1" /></TableCell>
                    <TableCell className="text-right tabular-nums text-gray-500 whitespace-nowrap">{formatNumber(r.all.impressions)} <ChangeIndicator change={r.all.impressionsChange} className="ml-1" /></TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{r.all.avgPosition ?? '—'} <ChangeIndicator change={r.all.avgPositionChange} className="ml-1" /></TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">
                      {r.priority?.avgPosition != null ? <>{r.priority.avgPosition} <ChangeIndicator change={r.priority.avgPositionChange} className="ml-1" /></> : <span className="text-gray-300">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.work.objectives ? `${r.work.actioned}/${r.work.objectives}` : <span className="text-gray-300">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.work.tasks || <span className="text-gray-300">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.improved.length || <span className="text-gray-300">—</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            Objectives shows actioned of planned. Tasks counts every task in those objectives. Clicks are Search Console clicks, not GA4 sessions.
          </p>
        </div>
      )}

      {/* What we did, period by period */}
      {newest.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-charcoal mb-3">What we did</h2>
          <div className="space-y-3">
            {newest.map(r => {
              const open = expanded === r.version.id
              return (
                <Card key={r.version.id}>
                  <CardContent className="p-0">
                    <button
                      onClick={() => setExpanded(open ? null : r.version.id)}
                      className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-charcoal">{r.label}</span>
                      <span className="text-xs text-gray-500">
                        {r.work.objectives
                          ? `${r.work.actioned} of ${r.work.objectives} objectives actioned · ${r.work.deliveredTasks} tasks · ${formatHours(r.work.hours)}`
                          : 'No OKR period covers these months'}
                      </span>
                      <span className="ml-auto flex items-center gap-3 text-xs">
                        {r.improved.length > 0 && <span className="text-green-600">{r.improved.length} pages improved</span>}
                        {r.declined.length > 0 && <span className="text-red-500">{r.declined.length} declined</span>}
                        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                      </span>
                    </button>

                    {open && (
                      <div className="border-t border-gray-100 px-4 py-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Work */}
                        <div>
                          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Work in these months</h3>
                          {r.okrPeriods.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No OKR period overlaps this review.</p>
                          ) : (
                            <ul className="space-y-2">
                              {r.okrPeriods.flatMap(p => (p.objectives || []).map(o => (
                                <li key={o.id} className="text-sm">
                                  <div className="flex items-start gap-2">
                                    <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', o.isActioned !== false ? 'bg-green-500' : 'bg-gray-300')} />
                                    <div className="min-w-0">
                                      <span className={cn('text-charcoal', o.isActioned === false && 'text-gray-400')}>{o.title}</span>
                                      <span className="text-xs text-gray-400 ml-1.5">{(o.keyResults || []).length} task{(o.keyResults || []).length === 1 ? '' : 's'}</span>
                                      {o.isActioned === false && o.notActionedReason && <span className="block text-[11px] text-gray-400 italic">{o.notActionedReason}</span>}
                                      {(o.linkedPageIds || []).length > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-coral-dark ml-1.5">
                                          <Link2 size={10} />
                                          {o.linkedPageIds.map(id => (sitemap?.pages || []).find(p => p.id === id)?.name).filter(Boolean).join(', ') || 'linked pages'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              )))}
                            </ul>
                          )}
                          {r.okrPeriods.length > 0 && (
                            <div className="mt-2 text-[11px] text-gray-400">
                              {r.okrPeriods.map(p => okrPeriodLabel(p)).join(', ')} · <Link to={`/okr/${client.id}`} className="text-coral hover:text-coral-dark">open in the OKR Planner</Link>
                            </div>
                          )}
                        </div>

                        {/* Movement */}
                        <div>
                          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 inline-flex items-center gap-1">
                            Pages that moved
                            <Hint>Average position across each page's tracked keywords, compared with the previous review. Pages in priority hubs are flagged.</Hint>
                          </h3>
                          {r.improved.length === 0 && r.declined.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Nothing to compare against the previous review yet.</p>
                          ) : (
                            <ul className="space-y-1">
                              {[...r.improved, ...r.declined].slice(0, 12).map(m => (
                                <li key={m.page.id} className="flex items-center gap-2 text-sm">
                                  {m.isPriority && <Flag size={10} className="text-coral shrink-0" fill="currentColor" />}
                                  <Link to={`/sitemap/${client.id}`} className="text-charcoal hover:text-coral truncate">{m.page.name}</Link>
                                  <span className="ml-auto flex items-center gap-2 shrink-0">
                                    <PositionChip position={m.avgPosition} />
                                    <ChangeIndicator change={m.change} />
                                  </span>
                                </li>
                              ))}
                              {r.improved.length + r.declined.length > 12 && (
                                <li className="text-[11px] text-gray-400">… and {r.improved.length + r.declined.length - 12} more</li>
                              )}
                            </ul>
                          )}
                          {r.priorityHubs.length > 0 && (
                            <div className="mt-2.5 pt-2.5 border-t border-gray-100 text-[11px] text-gray-500">
                              <span className="inline-flex items-center gap-1"><Layers size={11} className="text-gray-400" /> Priority hubs:</span>{' '}
                              {r.priorityHubs.map(h => h.name).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* OKR periods with no review to sit against */}
      {unmatchedOkr.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-charcoal mb-3 inline-flex items-center gap-1">
            Other OKR periods
            <Hint>Planned work whose months do not overlap any review version. Add a review covering those months to see what it moved.</Hint>
          </h2>
          <div className="flex flex-wrap gap-2">
            {unmatchedOkr.map(u => (
              <Link
                key={u.period.id}
                to={`/okr/${client.id}`}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs hover:border-coral transition-colors"
              >
                <span className="font-medium text-charcoal">{u.label}</span>
                <span className="text-gray-500"> · {u.work.actioned}/{u.work.objectives} objectives · {u.work.tasks} tasks · {formatHours(u.work.hours)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Nothing anywhere */}
      {!overview.hasReviews && totals.objectives === 0 && (
        <EmptyState
          icon={TrendingUp}
          title="Nothing recorded for this client yet"
          description="Plan a quarter in the OKR Planner and start a sitemap. Once a review version is added, this page shows what moved against the work done."
        />
      )}

      {/* Running totals */}
      {totals.objectives > 0 && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500 flex flex-wrap gap-x-6 gap-y-1">
          <span>All time: <b className="text-charcoal">{totals.objectives}</b> objectives planned, <b className="text-charcoal">{totals.actioned}</b> actioned</span>
          <span><b className="text-charcoal">{totals.tasks}</b> tasks · <b className="text-charcoal">{formatHours(totals.hours)}</b> allocated</span>
          {priorityHubCount > 0 && <span><b className="text-charcoal">{priorityHubCount}</b> priority hub{priorityHubCount === 1 ? '' : 's'} across {overview.priorityPageCount} pages</span>}
        </div>
      )}
    </div>
  )
}
