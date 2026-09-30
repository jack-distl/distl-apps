import { Plus } from 'lucide-react'
import { cn } from '../lib/utils'

// The "add another" control that sits where the next item would go: a
// dashed card at the end of a grid of cards, or a slim dashed row at the end
// of a list (`row`). Replaces the Add buttons that used to sit in section
// headers, away from the items they add to.
export function AddTile({ label, onClick, row = false, className, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      aria-label={label}
      className={cn(
        'group flex items-center justify-center gap-1.5 border border-dashed border-sage-line text-ink-faint transition-colors hover:border-pink hover:text-pink focus:outline-none focus-visible:border-pink focus-visible:text-pink',
        row ? 'w-full rounded-xl py-2 text-xs' : 'min-h-[8rem] w-full flex-col rounded-2xl text-sm',
        className
      )}
    >
      <span className={cn(
        'inline-flex items-center justify-center rounded-full border border-current',
        row ? 'h-5 w-5' : 'h-9 w-9'
      )}>
        <Plus size={row ? 12 : 18} />
      </span>
      <span>{label}</span>
    </button>
  )
}
