import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The periods of a plan as a row of pills, oldest on the left, newest on
 * the right: the tabs along the bottom of the old spreadsheet, brought to
 * the top. The one being looked at is the black pill; the dashed pill on
 * the end starts the next period. The same row on the team's screen and
 * the client's, so moving back through time is one click either way.
 *
 *   periods  [{ id, label, note }]   in order; `note` is a quiet suffix ("not shared")
 *   value    the current period's id
 */
export function PeriodPills({ periods = [], value, onChange, onNew, newLabel = 'New period', label = null, className }) {
  if (!periods.length && !onNew) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {label && <span className="mr-1 text-xs text-ink-soft">{label}</span>}
      {periods.length > 0 && (
        <div role="tablist" aria-label={label || 'Periods'} className="inline-flex flex-wrap items-center gap-1 rounded-full border border-sage-line bg-white p-1">
          {periods.map(p => {
            const active = p.id === value
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange?.(p.id)}
                className={cn(
                  'inline-flex h-8 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink/40',
                  active ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
                )}
              >
                {p.label}
                {p.note && <span className={cn('ml-1.5 font-normal', active ? 'text-white/70' : 'text-ink-faint')}>· {p.note}</span>}
              </button>
            )
          })}
        </div>
      )}
      {onNew && (
        <button
          type="button"
          onClick={onNew}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-sage-deep px-3 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <Plus size={14} /> {newLabel}
        </button>
      )}
    </div>
  )
}

/** A sort key for anything with startMonth and startYear: oldest first. */
export const periodOrder = p => (Number(p.startYear) || 0) * 12 + (Number(p.startMonth) || 0)
