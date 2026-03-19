import { useState, useEffect } from 'react'
import { Target, Map, Users, Clock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LoadingSpinner } from '../../components'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { useClients, fetchAllClientRetainers } from '../../hooks'
import { mockClientRetainers } from '../../lib/mockData'
import { HOURLY_RATE } from '../../lib/constants'

const apps = [
  { name: 'OKR Planner', description: 'Quarterly objective & hour planning', icon: Target, href: '/okr' },
  { name: 'WFM Hours', description: 'Job hours from WorkflowMax', icon: Clock, href: '/hours' },
  { name: 'Sitemap Tool', description: 'Visual sitemap with GSC data', icon: Map, href: '/sitemap', comingSoon: true },
]

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function Dashboard() {
  const { clients, loading } = useClients()
  const [retainersByClient, setRetainersByClient] = useState(null)

  useEffect(() => {
    fetchAllClientRetainers().then(data => {
      setRetainersByClient(data || mockClientRetainers)
    })
  }, [])

  if (loading) {
    return (
      <div className="max-w-5xl flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  const activeClients = clients.filter(c => c.is_active)
  const totalSeoRetainer = activeClients.reduce((sum, c) => sum + (retainersByClient?.[c.id]?.seo || 0), 0)
  const totalHours = Math.round(totalSeoRetainer / HOURLY_RATE)

  return (
    <div className="max-w-5xl">
      {/* Coral welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-r from-coral to-coral-dark rounded-xl p-8 mb-8"
      >
        <h1 className="text-2xl font-semibold text-white">
          G'day! Welcome to <span className="italic">distl</span> platform
        </h1>
        <p className="text-white/70 mt-1">Your internal tools, all in one spot.</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
      >
        {[
          { label: 'Active Clients', value: activeClients.length, icon: Users },
          { label: 'SEO Hours/Month', value: `~${totalHours}`, icon: Clock },
        ].map((stat) => (
          <motion.div key={stat.label} variants={fadeUp}>
            <Card className="border-l-4 border-l-coral">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <stat.icon className="w-4 h-4 text-coral" />
                  <span className="text-sm text-gray-500">{stat.label}</span>
                </div>
                <p className="text-2xl font-semibold text-charcoal">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* App Launcher */}
      <h2 className="text-lg font-semibold text-charcoal mb-4">Apps</h2>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {apps.map((app) => (
          <motion.div key={app.name} variants={fadeUp}>
            {app.comingSoon ? (
              <Card className="opacity-50 cursor-not-allowed">
                <CardContent className="p-5">
                  <AppCardContent app={app} />
                </CardContent>
              </Card>
            ) : (
              <Link to={app.href}>
                <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <AppCardContent app={app} />
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

function AppCardContent({ app }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-coral-50 flex items-center justify-center">
          <app.icon className="w-5 h-5 text-coral" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-charcoal">{app.name}</h3>
            {app.comingSoon && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0">Soon</Badge>
            )}
          </div>
        </div>
        {!app.comingSoon && (
          <ArrowRight className="w-4 h-4 text-gray-300" />
        )}
      </div>
      <p className="text-sm text-gray-500">{app.description}</p>
    </>
  )
}
