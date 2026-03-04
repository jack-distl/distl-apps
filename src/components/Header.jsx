import { Menu, LogOut, User } from 'lucide-react'
import { Avatar, AvatarFallback } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

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
    </header>
  )
}
