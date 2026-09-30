import { cn } from '@/lib/utils'
import { Hint } from './Hint'

const sizes = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-5xl',
}

/**
 * A figure and its label, set as type rather than boxed in a tile: Poppins
 * Light at display size, black by default, pink for the one number the row
 * is about. No icon, no coloured edge. Lay several out with StatRow.
 */
export function Stat({ label, value, sub, hint, accent = false, size = 'md', className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="inline-flex items-center gap-1 text-sm text-ink-soft">
        {label}
        {hint && <Hint size={11}>{hint}</Hint>}
      </p>
      <p
        className={cn(
          'mt-1.5 font-light leading-none tracking-tight tabular-nums',
          sizes[size] || sizes.md,
          accent ? 'text-pink' : 'text-ink'
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-2 text-xs text-ink-faint">{sub}</p>}
    </div>
  )
}

const layouts = {
  2: 'sm:grid-cols-2 sm:divide-x sm:divide-sage-line sm:[&>*]:px-6 sm:[&>*:first-child]:pl-0 sm:[&>*:last-child]:pr-0',
  3: 'sm:grid-cols-3 sm:divide-x sm:divide-sage-line sm:[&>*]:px-6 sm:[&>*:first-child]:pl-0 sm:[&>*:last-child]:pr-0',
  4: 'grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-sage-line lg:[&>*]:px-6 lg:[&>*:first-child]:pl-0 lg:[&>*:last-child]:pr-0',
  5: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 xl:divide-x xl:divide-sage-line xl:[&>*]:px-6 xl:[&>*:first-child]:pl-0 xl:[&>*:last-child]:pr-0',
}

/** A white panel holding a row of Stats, separated by hairlines once there is room. */
export function StatRow({ children, columns = 3, className }) {
  return (
    <div className={cn('grid gap-6 rounded-3xl border border-sage-line bg-white p-6', layouts[columns] || layouts[3], className)}>
      {children}
    </div>
  )
}
