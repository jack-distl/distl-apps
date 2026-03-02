import { ProgressBar } from './ProgressBar'

export function HoursSummaryBar({ summary }) {
  if (!summary) return null

  const { totalAllocated, totalUsed, activeJobs } = summary
  const percent = totalAllocated > 0
    ? (totalUsed / totalAllocated) * 100
    : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs text-gray-500">
        <span>{Number(totalUsed).toFixed(1)}h / {Number(totalAllocated).toFixed(1)}h</span>
        <span>{activeJobs} active job{activeJobs !== 1 ? 's' : ''}</span>
      </div>
      <ProgressBar percent={percent} showLabel={false} size="sm" />
    </div>
  )
}
