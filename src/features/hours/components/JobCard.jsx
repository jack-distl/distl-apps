import { Calendar } from 'lucide-react'
import { Badge } from '../../../components/ui/badge'
import { Card, CardContent } from '../../../components/ui/card'
import { ProgressBar } from './ProgressBar'

const STATE_VARIANTS = {
  'In Progress': 'coral',
  'Completed': 'success',
  'Planned': 'default',
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function JobCard({ job }) {
  const isOverBudget = job.remaining_hours < 0
  const hasNoBudget = job.budget_type === 'no_budget' || Number(job.allocated_hours) === 0
  const isCompleted = job.state === 'Completed'

  return (
    <Card className={isCompleted ? 'opacity-70' : ''}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-charcoal truncate">{job.name}</h3>
            {job.wfm_job_number && (
              <span className="text-xs text-gray-400">{job.wfm_job_number}</span>
            )}
          </div>
          <Badge variant={STATE_VARIANTS[job.state] || 'default'}>
            {job.state}
          </Badge>
        </div>

        {/* Date range */}
        {(job.start_date || job.due_date) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
            <Calendar className="w-3 h-3" />
            <span>
              {formatDate(job.start_date)}
              {job.due_date && ` – ${formatDate(job.due_date)}`}
            </span>
          </div>
        )}

        {/* Hours stats */}
        {hasNoBudget ? (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-500">Used</span>
              <span className="text-lg font-semibold text-charcoal">{Number(job.used_hours).toFixed(1)}h</span>
            </div>
            <span className="text-xs text-gray-400 italic">No budget set</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Allocated</p>
                <p className="text-sm font-semibold text-charcoal">{Number(job.allocated_hours).toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Used</p>
                <p className="text-sm font-semibold text-charcoal">{Number(job.used_hours).toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Remaining</p>
                <p className={`text-sm font-semibold ${isOverBudget ? 'text-red-600' : 'text-charcoal'}`}>
                  {Number(job.remaining_hours).toFixed(1)}h
                </p>
              </div>
            </div>
            <ProgressBar percent={Number(job.usage_percent)} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
