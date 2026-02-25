import { Menu } from 'lucide-react'

export function Header({ onMenuToggle, user }) {
  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-gray-500 hover:text-gray-700"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-coral font-bold text-lg italic">distl</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">platform</span>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{user.name}</span>
          <div className="w-8 h-8 rounded-full bg-coral/10 text-coral text-xs font-medium flex items-center justify-center">
            {user.name?.split(' ').map(n => n[0]).join('')}
          </div>
        </div>
      )}
    </header>
  )
}
