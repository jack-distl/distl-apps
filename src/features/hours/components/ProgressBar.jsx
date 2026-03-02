export function ProgressBar({ percent, showLabel = true, size = 'md' }) {
  const clampedPercent = Math.min(100, Math.max(0, percent))
  const color =
    percent >= 85 ? 'bg-red-500' :
    percent >= 60 ? 'bg-amber-500' :
    'bg-green-500'

  const height = size === 'sm' ? 'h-1.5' : 'h-2'

  return (
    <div>
      <div className={`w-full bg-gray-100 rounded-full ${height}`}>
        <div
          className={`${height} rounded-full transition-all ${color}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 mt-1 block">
          {Math.round(percent)}% used
        </span>
      )}
    </div>
  )
}
