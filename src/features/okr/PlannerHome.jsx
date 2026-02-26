import { Link } from 'react-router-dom'
import { Badge } from '../../components'
import { mockClients, mockOkrData } from '../../lib/mockData'
import { HOURLY_RATE, getPeriodLabel } from '../../lib/constants'

export default function PlannerHome() {
  const activeClients = mockClients.filter(c => c.is_active)

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">OKR Planner</h1>
        <p className="text-gray-500 mt-1">
          Plan objectives and allocate retainer hours (${HOURLY_RATE}/hr)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeClients.map(client => {
          const data = mockOkrData[client.id]
          const latestPeriod = data?.periods[data.periods.length - 1]
          const hours = Math.round(client.monthly_retainer / HOURLY_RATE)

          return (
            <Link
              key={client.id}
              to={`/okr/${client.id}`}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow block"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-charcoal">{client.name}</h3>
                  <span className="text-sm text-gray-500">{client.abbreviation}</span>
                </div>
                {latestPeriod ? (
                  <Badge variant={latestPeriod.isPublished ? 'success' : 'coral'}>
                    {latestPeriod.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                ) : (
                  <Badge>No plan</Badge>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-3">
                ${client.monthly_retainer.toLocaleString()}/mo &middot; ~{hours} hrs
              </p>

              {latestPeriod ? (
                <>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                    {latestPeriod.goal}
                  </p>
                  <span className="text-sm text-coral font-medium">
                    {getPeriodLabel(latestPeriod.startMonth, latestPeriod.startYear, latestPeriod.endMonth, latestPeriod.endYear)} &rarr;
                  </span>
                </>
              ) : (
                <span className="text-sm text-coral font-medium">
                  Start planning &rarr;
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
