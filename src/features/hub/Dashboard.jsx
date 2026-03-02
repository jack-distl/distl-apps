import { Target, Map, Users, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, LoadingSpinner } from '../../components'
import { useClients } from '../../hooks'
import { HOURLY_RATE } from '../../lib/constants'

const apps = [
  { name: 'OKR Planner', description: 'Quarterly objective & hour planning', icon: Target, href: '/okr' },
  { name: 'WFM Hours', description: 'Job hours from WorkflowMax', icon: Clock, href: '/hours' },
  { name: 'Sitemap Tool', description: 'Visual sitemap with GSC data', icon: Map, href: '/sitemap', comingSoon: true },
]

export default function Dashboard() {
  const { clients, loading } = useClients()

  if (loading) {
    return (
      <div className="max-w-5xl flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">
          G'day! Welcome to <span className="text-coral italic">distl</span> platform
        </h1>
        <p className="text-gray-500 mt-1">Your internal tools, all in one spot.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Active Clients', value: clients.filter(c => c.is_active).length, icon: Users },
          { label: 'Hours This Month', value: `~${Math.round(clients.filter(c => c.is_active).reduce((sum, c) => sum + c.monthly_retainer, 0) / HOURLY_RATE)}`, icon: Clock },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <stat.icon className="w-4 h-4 text-coral" />
              <span className="text-sm text-gray-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-semibold text-charcoal">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* App Launcher */}
      <h2 className="text-lg font-semibold text-charcoal mb-4">Apps</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map((app) =>
          app.comingSoon ? (
            <div
              key={app.name}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm opacity-50 cursor-not-allowed"
            >
              <AppCardContent app={app} />
            </div>
          ) : (
            <Link
              key={app.name}
              to={app.href}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <AppCardContent app={app} />
            </Link>
          )
        )}
      </div>
    </div>
  )
}

function AppCardContent({ app }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center">
          <app.icon className="w-5 h-5 text-coral" />
        </div>
        <div>
          <h3 className="font-medium text-charcoal">{app.name}</h3>
          {app.comingSoon && (
            <span className="text-xs text-gray-400">Coming soon</span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500">{app.description}</p>
    </>
  )
}
