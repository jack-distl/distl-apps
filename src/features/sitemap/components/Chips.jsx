import { Badge } from '../../../components/ui/badge'
import { STATUS_META } from '../../../lib/sitemap/tree'
import { positionBand } from '../../../lib/sitemap/perf'
import { cn } from '@/lib/utils'

export const STATUS_VARIANT = {
  keep: 'success',
  add: 'info',
  opportunity: 'warning',
  functional: 'default',
}

export const BAND_VARIANT = {
  top: 'success',
  page1: 'info',
  page2: 'warning',
  deep: 'default',
}

export function StatusChip({ status, className }) {
  const meta = STATUS_META[status] || { label: status }
  return <Badge variant={STATUS_VARIANT[status] || 'default'} className={className}>{meta.label}</Badge>
}

export function PositionChip({ position, className }) {
  const band = positionBand(position)
  if (!band) return <span className={cn('text-xs text-gray-300', className)}>—</span>
  return (
    <Badge variant={BAND_VARIANT[band]} className={cn('font-semibold tabular-nums', className)}>
      #{Number(position) % 1 === 0 ? position : Number(position).toFixed(1)}
    </Badge>
  )
}

/** ▲ / ▼ change marker. `change` from lib/sitemap/perf change(). */
export function ChangeIndicator({ change, className }) {
  if (!change || change.kind === 'none') return null
  if (change.kind === 'new') return <span className={cn('text-[11px] font-semibold text-green-600', className)}>new</span>
  if (change.kind === 'flat') return <span className={cn('text-[11px] text-gray-300', className)}>—</span>
  const up = change.kind === 'up'
  return (
    <span className={cn('text-[11px] font-semibold tabular-nums', up ? 'text-green-600' : 'text-red-500', className)}>
      {up ? '▲' : '▼'} {Number(change.delta).toLocaleString('en-AU')}
    </span>
  )
}

/** Small colour dot for legends. */
export function Dot({ variant, className }) {
  const colour = {
    success: 'bg-green-500',
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
    default: 'bg-gray-400',
  }[variant] || 'bg-gray-400'
  return <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', colour, className)} />
}
