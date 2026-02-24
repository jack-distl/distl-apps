import { LayoutDashboard, Target, Map, Settings } from 'lucide-react'

const navItems = [
  { label: 'Hub', href: '/', icon: LayoutDashboard },
  { label: 'OKR Planner', href: '/okr', icon: Target },
  { label: 'Sitemap Tool', href: '/sitemap', icon: Map },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar({ currentPath = '/', open = true }) {
  return (
    <aside
      className={`${
        open ? 'translate-x-0' : '-translate-x-full'
      } fixed lg:static inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-100 transition-transform lg:translate-x-0`}
    >
      <nav className="p-3 pt-4 space-y-1">
        {navItems.map((item) => {
          const active = currentPath === item.href
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-coral/10 text-coral-dark font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </a>
          )
        })}
      </nav>
    </aside>
  )
}
