import { Info } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip'
import { cn } from '../lib/utils'

/**
 * A tiny info marker with a hover explanation. Use sparingly, only where a
 * label cannot explain itself. `children` is the explanation; place the
 * component right after the label it explains.
 */
export function Hint({ children, className, side = 'top', size = 12 }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="What is this?"
            onClick={e => e.stopPropagation()}
            className={cn('inline-flex items-center text-gray-300 hover:text-gray-500 align-middle cursor-help', className)}
          >
            <Info size={size} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed font-normal">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
