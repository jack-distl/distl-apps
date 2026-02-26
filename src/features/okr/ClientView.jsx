import { useParams, Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye } from 'lucide-react'
import { Badge } from '../../components'
import { useOkr } from './OkrContext'
import { HOURLY_RATE } from '../../lib/constants'

export default function ClientView() {
  const { clientId } = useParams()
  const [searchParams] = useSearchParams()
  const periodId = searchParams.get('period')
  const { state } = useOkr()

  const client = state.clients.find((c) => c.id === clientId)
  const periods = state.periods.filter((p) => p.client_id === clientId)
  const period = periodId
    ? periods.find((p) => p.id === periodId)
    : periods[periods.length - 1]
  const objectives = state.objectives.filter((o) => o.period_id === period?.id)

  if (!client) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-gray-500">Client not found.</p>
      </div>
    )
  }

  const monthlyHours = Math.round(client.monthly_retainer / HOURLY_RATE)
  const quarterlyHours = monthlyHours * 3
  const totalHours = objectives.reduce(
    (sum, obj) => sum + obj.tasks.reduce((s, t) => s + t.am_hours + t.seo_hours, 0),
    0
  )
  const completedTasks = objectives.reduce(
    (sum, obj) => sum + obj.tasks.filter((t) => t.status === 'done').length,
    0
  )
  const totalTasks = objectives.reduce((sum, obj) => sum + obj.tasks.length, 0)

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to={`/okr/${clientId}`}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-coral mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to internal view
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-coral font-medium mb-2">
          <Eye className="w-3.5 h-3.5" />
          Client View
        </div>
        <h1 className="text-2xl font-semibold text-charcoal">{client.name}</h1>
        {period && (
          <p className="text-gray-500 mt-1">
            {period.label} Plan &middot; {period.goal}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Quarterly Hours</p>
          <p className="text-lg font-semibold text-charcoal">{quarterlyHours} hrs</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Hours Allocated</p>
          <p className="text-lg font-semibold text-charcoal">{totalHours} hrs</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Tasks Complete</p>
          <p className="text-lg font-semibold text-charcoal">
            {completedTasks}/{totalTasks}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>Overall progress</span>
          <span>{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-coral rounded-full transition-all"
            style={{
              width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {objectives.length > 0 ? (
        <div className="space-y-6">
          {objectives.map((obj) => {
            const objHours = obj.tasks.reduce(
              (s, t) => s + t.am_hours + t.seo_hours,
              0
            )
            const objComplete = obj.tasks.filter((t) => t.status === 'done').length

            return (
              <div
                key={obj.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="p-5 border-b border-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-charcoal">{obj.title}</h3>
                    <span className="text-sm text-gray-400">{objHours} hrs</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {objComplete} of {obj.tasks.length} tasks complete
                  </p>
                </div>
                <div className="divide-y divide-gray-50">
                  {obj.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="px-5 py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            task.status === 'done'
                              ? 'bg-green-400'
                              : task.status === 'in_progress'
                              ? 'bg-coral'
                              : 'bg-gray-300'
                          }`}
                        />
                        <span
                          className={`text-sm ${
                            task.status === 'done'
                              ? 'text-gray-400 line-through'
                              : 'text-gray-700'
                          }`}
                        >
                          {task.description}
                        </span>
                      </div>
                      <Badge
                        variant={
                          task.status === 'done'
                            ? 'success'
                            : task.status === 'in_progress'
                            ? 'coral'
                            : 'default'
                        }
                      >
                        {task.status === 'in_progress'
                          ? 'In Progress'
                          : task.status === 'done'
                          ? 'Done'
                          : 'Planned'}
                      </Badge>
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
