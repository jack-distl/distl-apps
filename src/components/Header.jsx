import { Menu, LogOut, User, Eye, EyeOff } from 'lucide-react'
import { cn } from '../lib/utils'
import { useClientView } from '../hooks/useClientView'
import { Avatar, AvatarFallback } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

/**
 * The one switch between the team's screens and the client's. Platform
 * wide: on, every client tab shows what the client sees, as a report, with
 * nothing to edit; off, the tools. Coral while it is on so nobody forgets
 * which way it is set.
 */
export function ClientViewSwitch({ className }) {
  const { clientView, toggle } = useClientView()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={clientView}
      onClick={toggle}
      title={clientView ? 'Client view is on: every client screen shows what the client sees. Click to go back to the tools.' : 'Show every client screen the way the client sees it, for walking a client through their plan.'}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full border pl-3 pr-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/50 focus-visible:ring-offset-2',
        clientView ? 'border-pink bg-pink text-white hover:bg-pink-dark hover:border-pink-dark' : 'border-sage-line bg-white text-ink-soft hover:border-ink hover:text-ink',
        className
      )}
    >
      {clientView ? <Eye size={15} /> : <EyeOff size={15} />}
      <span>Client view</span>
      <span className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', clientView ? 'bg-white/30' : 'bg-sage-deep')} aria-hidden="true">
        <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', clientView ? 'translate-x-[18px]' : 'translate-x-0.5')} />
      </span>
    </button>
  )
}

export function Header({ onMenuToggle, user, onSignOut }) {
  const initials = user?.name?.split(' ').map(n => n[0]).join('') || '?'

  return (
    <header className="h-14 bg-white border-b border-border border-t-2 border-t-coral flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo visible only on mobile (desktop shows in sidebar) */}
        <div className="flex items-center gap-2 lg:hidden">
          <img
            src="/logos/distl-type-coral.svg"
            alt="Distl"
            className="h-4 w-auto"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
      <ClientViewSwitch />
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 outline-none">
            <span className="text-sm text-gray-600 hidden sm:inline">{user.name}</span>
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user.name}</p>
              {user.email && (
                <p className="text-xs text-muted-foreground">{user.email}</p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            {onSignOut && (
              <DropdownMenuItem onClick={onSignOut} className="text-red-600 focus:text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      </div>
    </header>
  )
}
