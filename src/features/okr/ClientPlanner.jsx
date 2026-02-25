import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '../../components'
import { mockClients, mockOkrPeriods, mockObjectives } from '../../lib/mockData'
import { HOURLY_RATE, AM_HOUR_TARGET, SEO_HOUR_TARGET } from '../../lib/constants'

export default function ClientPlanner() {
  const { clientId } = useParams()

  const client = mockClients.find((c) => c.id === clientId)
  const period = mockOkrPeriods.find((p) => p.client_id === clientId)
  const objectives = mockObjectives.filter((o) => o.period_id === period?.id)

  if (!client) {
    return (
      <div className="max-w-5xl">
        <p className="text-gray-500">Client not found.</p>
        <Link to="/okr" className="text-coral hover:text-coral-dark text-sm mt-2 inline-block">
          &larr; Back to OKR Planner
        </Link>
      </div>
    )
  }

  const monthlyHours = Math.round(client.monthly_retainer / HOURLY_RATE)
  const quarterlyHours = monthlyHours * 3

  // Calculate totals from objectives
  const totalAmHours = objectives.reduce(
    (sum, obj) => sum + obj.tasks.reduce((s, t) => s + t.am_hours, 0),
    0
  )
  const totalSeoHours = objectives.reduce(
    (sum, obj) => sum + obj.tasks.reduce((s, t) => s + t.seo_hours, 0),
    0
  )
  const totalHours = totalAmHours + totalSeoHours
  const amPercent = totalHours > 0 ? Math.round((totalAmHours / totalHours) * 100) : 0
  const seoPercent = totalHours > 0 ? Math.round((totalSeoHours / totalHours) * 100) : 0

  return (
    <div className="max-w-5xl">
      <Link to="/okr" className="flex items-center gap-1 text-sm text-gray-500 hover:text-coral mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to OKR Planner
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-semibold text-charcoal">{client.name}</h1>
          {period && (
            <Badge variant={period.is_published ? 'success' : 'coral'}>
              {period.is_published ? 'Published' : 'Draft'}
            </Badge>
          )}
        </div>
        {period && (
          <p className="text-gray-500">{period.label} &middot; {period.goal}</p>
        )}
      </div>

      {/* Hour Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Monthly Retainer" value={`$${client.monthly_retainer.toLocaleString()}`} />
        <SummaryCard label="Quarterly Hours" value={`${quarterlyHours} hrs`} />
        <SummaryCard
          label={`AM Hours (target ${Math.round(AM_HOUR_TARGET * 100)}%)`}
          value={`${totalAmHours} hrs`}
          sublabel={`${amPercent}% of allocated`}
        />
        <SummaryCard
          label={`SEO Hours (target ${Math.round(SEO_HOUR_TARGET * 100)}%)`}
          value={`${totalSeoHours} hrs`}
          sublabel={`${seoPercent}% of allocated`}
        />
      </div>

      {/* Allocation Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>{totalHours} of {quarterlyHours} hours allocated</span>
          <span>{Math.round((totalHours / quarterlyHours) * 100)}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-coral rounded-full transition-all"
            style={{ width: `${Math.min((totalHours / quarterlyHours) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Objectives */}
      {objectives.length > 0 ? (
        <div className="space-y-6">
          {objectives.map((obj) => {
            const objAmHrs = obj.tasks.reduce((s, t) => s + t.am_hours, 0)
            const objSeoHrs = obj.tasks.reduce((s, t) => s + t.seo_hours, 0)

            return (
              <div key={obj.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-charcoal">{obj.title}</h3>
                    <Badge variant={obj.scope === 'seo' ? 'coral' : obj.scope === 'am' ? 'warning' : 'default'}>
                      {obj.scope.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-400">
                    {objAmHrs + objSeoHrs} hrs ({objAmHrs} AM / {objSeoHrs} SEO)
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {obj.tasks.map((task) => (
                    <div key={task.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusDot status={task.status} />
                        <span className="text-sm text-gray-700">{task.description}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        {task.am_hours > 0 && <span>AM: {task.am_hours}h</span>}
                        {task.seo_hours > 0 && <span>SEO: {task.seo_hours}h</span>}
                        <Badge
                          variant={
                            task.status === 'done' ? 'success'
                            : task.status === 'in_progress' ? 'coral'
                            : 'default'
                          }
                        >
                          {task.status === 'in_progress' ? 'In Progress' : task.status === 'done' ? 'Done' : 'Planned'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm text-center">
          <p className="text-gray-500">No objectives planned for this period yet.</p>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, sublabel }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-charcoal">{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
    </div>
  )
}

function StatusDot({ status }) {
  const colors = {
    done: 'bg-green-400',
    in_progress: 'bg-coral',
    planned: 'bg-gray-300',
  }

  return <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
}
