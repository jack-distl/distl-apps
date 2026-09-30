import { cn } from '@/lib/utils'

const tones = {
  pink: 'border-pink text-pink',
  ink: 'border-ink text-ink',
  soft: 'border-sage-line text-ink-soft',
  white: 'border-white/30 text-white/70',
  fill: 'border-pink bg-pink text-white',
}

/**
 * The outlined pill from the brand layouts ("We are hiring", the client name
 * on a slide). Use it where a small marker is needed instead of a small
 * letter-spaced capitals label: it stays sentence case at a readable size.
 */
export function Tag({ children, tone = 'pink', size = 'sm', className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border font-medium leading-none',
        size === 'xs' ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        tones[tone] || tones.pink,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
