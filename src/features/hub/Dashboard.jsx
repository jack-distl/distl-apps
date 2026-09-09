import { useState, useEffect } from 'react'
import { Target, Map as MapIcon, Users, Clock, ArrowRight, TrendingUp, CheckCircle2, Flag, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LoadingSpinner, Hint } from '../../components'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table'
import { useClients, fetchAllClientRetainers } from '../../hooks'
import { useHubStats } from '../../hooks/useHubStats'
import { mockClientRetainers } from '../../lib/mockData'
import { HOURLY_RATE, formatHours } from '../../lib/constants'
import { formatNumber } from '../../lib/sitemap/tree'
import { ChangeIndicator } from '../sitemap/components/Chips'

const apps = [
  { name: 'OKR Planner', description: 'Quarterly objective and hour planning', icon: Target, href: '/okr' },
  { name: 'Sitemap Tool', description: 'SEO Foundations sitemaps, keywords and reviews', icon: MapIcon, href: '/sitemap' },
  { name: 'Clients', description: 'Every client, and what we have moved for them', icon: Users, href: '/clients' },
]

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

function StatCard({ icon: Icon, label, value, sub, hint, accent = false }) {
  return (
    <Card className={accent ? 'border-l-4 border-l-coral' : ''}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-coral shrink-0" />
          <span className="text-sm text-gray-500 inline-flex items-center gap-1">{label}{hint && <Hint size={11}>{hint}</Hint>}</span>
        </div>
        <p className="text-2xl font-semibold text-charcoal tabular-nums leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { clients, loading } = useClients()
  const [retainersByClient, setRetainersByClient] = useState(null)
  const activeClients = clients.filter(c => c.is_active)
  const { stats, loading: statsLoading } = useHubStats(activeClients)

  useEffect(() => {
    fetchAllClientRetainers().then(data => setRetainersByClient(data || mockClientRetainers))
  }, [])

  if (loading) {
    return <div className="max-w-5xl flex items-center justify-center py-20"><LoadingSpinner /></div>
  }

  const totalSeoRetainer = activeClients.reduce((sum, c) => sum + (retainersByClient?.[c.id]?.seo || 0), 0)
  const monthlyHours = Math.round(totalSeoRetainer / HOURLY_RATE)
  const clicksChange = stats
    ? { kind: stats.clicksDelta > 0 ? 'up' : stats.clicksDelta < 0 ? 'down' : 'flat', delta: Math.abs(stats.clicksDelta) }
    : null

  return (
    <div className="w-full max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">Distl <span className="italic text-coral">platform</span></h1>
        <p className="text-gray-500 mt-1">
          {activeClients.length} active client{activeClients.length === 1 ? '' : 's'}
          {stats?.reviewedClients ? ` · ${stats.reviewedClients} with a performance review` : ''}
        </p>
      </div>

      {/* What we have delivered */}
      <h2 className="text-sm font-semibold text-charcoal mb-3">Delivered</h2>
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div variants={fadeUp}>
          <StatCard
            icon={CheckCircle2}
            accent
            label="Tasks delivered"
            value={statsLoading ? '—' : formatNumber(stats?.tasksDelivered ?? 0)}
            sub={stats ? `${stats.objectivesActioned} objectives actioned · ${formatHours(stats.hours)} planned` : null}
            hint="Every task inside an objective marked Actioned, across all clients and quarters."
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            icon={Users}
            label="Active clients"
            value={activeClients.length}
            sub={`${formatNumber(monthlyHours)} SEO hours a month`}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            icon={Clock}
            label="SEO retainer"
            value={`$${formatNumber(totalSeoRetainer)}`}
            sub={`per month at $${HOURLY_RATE}/hr`}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            icon={FileText}
            label="Pages improved"
            value={statsLoading ? '—' : formatNumber(stats?.pagesImproved ?? 0)}
            sub="at the latest review for each client"
            hint="Pages whose tracked keywords average a better position than at the review before."
          />
        </motion.div>
      </motion.div>

      {/* What moved */}
      <h2 className="text-sm font-semibold text-charcoal mb-3 inline-flex items-center gap-1">
        Latest reviews
        <Hint>Each client's most recent review compared with the one before it. Clients without a review yet are not counted.</Hint>
      </h2>
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div variants={fadeUp}>
          <StatCard
            icon={Flag}
            accent
            label="Priority keywords improved"
            value={statsLoading ? '—' : formatNumber(stats?.priorityImproved ?? 0)}
            sub={stats?.priorityCompared ? `of ${formatNumber(stats.priorityCompared)} compared` : 'no priority hubs flagged yet'}
            hint="Keywords on pages in hubs flagged Priority that rank better than at the previous review."
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            icon={TrendingUp}
            label="Keywords improved"
            value={statsLoading ? '—' : formatNumber(stats?.keywordsImproved ?? 0)}
            sub={stats?.keywordsCompared ? `of ${formatNumber(stats.keywordsCompared)} compared` : null}
            hint="Every tracked keyword that ranks better than at the previous review. Keywords that only rank in one of the two are not counted either way."
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            icon={TrendingUp}
            label="Search clicks"
            value={statsLoading ? '—' : formatNumber(stats?.clicks ?? 0)}
            sub={
              clicksChange && clicksChange.kind !== 'flat'
                ? <span className="inline-flex items-center gap-1"><ChangeIndicator change={clicksChange} /> against the previous review</span>
                : 'across the latest reviews'
            }
            hint="Search Console clicks summed across each client's latest review period. Not GA4 sessions."
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            icon={TrendingUp}
            label="Impressions"
            value={statsLoading ? '—' : formatNumber(stats?.impressions ?? 0)}
            sub={
              stats && stats.impressionsDelta !== 0
                ? <span className="inline-flex items-center gap-1"><ChangeIndicator change={{ kind: stats.impressionsDelta > 0 ? 'up' : 'down', delta: Math.abs(stats.impressionsDelta) }} /> against the previous review</span>
                : 'across the latest reviews'
            }
          />
        </motion.div>
      </motion.div>

      {/* Per client */}
      {stats?.movers?.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-charcoal mb-3">Movement by client</h2>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Client</TableHead>
                  <TableHead>Latest review</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Avg position</TableHead>
                  <TableHead className="text-right">Priority keywords up</TableHead>
                  <TableHead className="text-right">Pages improved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.movers.map(m => (
                  <TableRow key={m.client.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-charcoal">
                      <Link to={`/clients/${m.client.id}`} className="hover:text-coral">{m.client.name}</Link>
                    </TableCell>
                    <TableCell className="text-gray-500 whitespace-nowrap">{m.label}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">
                      {formatNumber(m.clicks)} <ChangeIndicator change={m.clicksChange} className="ml-1" />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap"><ChangeIndicator change={m.avgPositionChange} /></TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.priorityImproved == null
                        ? <span className="text-gray-300">—</span>
                        : <>{m.priorityImproved}<span className="text-gray-400 text-xs"> / {m.priorityCompared}</span></>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.pagesImproved || <span className="text-gray-300">—</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Apps */}
      <h2 className="text-sm font-semibold text-charcoal mb-3">Apps</h2>
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map((app) => (
          <motion.div key={app.name} variants={fadeUp}>
            <Link to={app.href}>
              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-coral-50 flex items-center justify-center shrink-0">
                        <app.icon className="w-5 h-5 text-coral" />
                      </div>
                      <h3 className="font-medium text-charcoal flex-1">{app.name}</h3>
                      <ArrowRight className="w-4 h-4 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500">{app.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
