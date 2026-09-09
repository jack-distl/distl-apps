import { useState } from 'react'
import { LayoutDashboard, Target, LayoutTemplate, Map, Settings, Users, ChevronRight, ChevronDown, TrendingUp } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Separator } from './ui/separator'
import { useClients } from '../hooks/useClients'

const navItems = [
  { label: 'Hub', href: '/', icon: LayoutDashboard },
  { label: 'OKR Planner', href: '/okr', icon: Target },
  // Sub-item of OKR Planner: only shown while in the OKR area, indented
  { label: 'Edit Templates', href: '/okr/templates', icon: LayoutTemplate, parent: '/okr', indent: true },
  { label: 'Sitemap Tool', href: '/sitemap', icon: Map },
  { label: 'Settings', href: '/settings', icon: Settings, disabled: true },
]

function isMatch(href, pathname) {
  return pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
}

// Per-client services linked from the sidebar client list
const CLIENT_SERVICES = [
  { label: 'Overview', href: id => `/clients/${id}`, icon: TrendingUp },
  { label: 'OKR Planner', href: id => `/okr/${id}`, icon: Target },
  { label: 'Sitemap Tool', href: id => `/sitemap/${id}`, icon: Map },
]

function ClientList({ pathname, onClose }) {
  const { clients } = useClients()
  const [openId, setOpenId] = useState(null)
  const active = clients.filter(c => c.is_active)
  // Auto-expand the client whose page is open
  const currentId = pathname.match(/^\/(?:okr|sitemap|clients)\/([^/]+)/)?.[1] || null
  const expanded = openId ?? currentId

  return (
    <div className="px-3 pb-2">
      <Link
        to="/clients"
        onClick={() => onClose?.()}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
          pathname === '/clients' ? 'bg-white/10 text-white font-medium border-l-2 border-coral' : 'text-white/60 hover:bg-white/5 hover:text-white'
        )}
      >
        <Users className={cn('w-4 h-4', pathname === '/clients' && 'text-coral')} />
        Clients
        <span className="ml-auto text-[10px] text-white/30">{active.length}</span>
      </Link>
      <ul className="mt-1 max-h-[38vh] overflow-y-auto pr-1 space-y-0.5">
        {active.map(c => {
          const isOpen = expanded === c.id
          const isCurrent = currentId === c.id
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? '' : c.id)}
                className={cn(
                  'w-full flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-md text-[13px] text-left transition-colors',
                  isCurrent ? 'text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
                )}
              >
                {isOpen ? <ChevronDown className="w-3 h-3 shrink-0 text-white/30" /> : <ChevronRight className="w-3 h-3 shrink-0 text-white/30" />}
                <span className="truncate">{c.name}</span>
              </button>
              {isOpen && (
                <ul className="ml-6 mb-1 border-l border-white/10 pl-2 space-y-0.5">
                  {CLIENT_SERVICES.map(svc => {
                    const href = svc.href(c.id)
                    const on = pathname === href || pathname.startsWith(href + '/')
                    return (
                      <li key={svc.label}>
                        <Link
                          to={href}
                          onClick={() => onClose?.()}
                          className={cn('flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors', on ? 'text-coral' : 'text-white/45 hover:text-white hover:bg-white/5')}
                        >
                          <svc.icon className="w-3 h-3" /> {svc.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
        {!active.length && <li className="pl-4 py-1 text-xs text-white/30">No active clients</li>}
      </ul>
    </div>
  )
}

export function Sidebar({ open = false, onClose }) {
  const { pathname } = useLocation()

  // Sub-items (with a `parent`) only appear while inside that section
  const visibleItems = navItems.filter(
    item => !item.parent || pathname.startsWith(item.parent)
  )

  // Highlight only the most specific matching nav item (e.g. /okr/templates
  // lights "Edit Templates", not also "OKR Planner").
  const activeHref = visibleItems
    .filter(item => !item.disabled && isMatch(item.href, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 shrink-0">
        <img
          src="/logos/distl-type-white.svg"
          alt="Distl"
          className="h-5 w-auto"
        />
        <span className="text-white/30 mx-2.5">|</span>
        <span className="text-white/50 text-sm">platform</span>
      </div>

      <Separator className="bg-white/10" />

      {/* Navigation */}
      <nav className="p-3 space-y-1 mt-2">
        {visibleItems.map((item) => {
          const active = item.href === activeHref
          return (
            <Link
              key={item.href}
              to={item.disabled ? '#' : item.href}
              onClick={(e) => {
                if (item.disabled) e.preventDefault()
                else onClose?.()
              }}
              className={cn(
                'flex items-center gap-3 py-2 rounded-lg transition-colors',
                item.indent ? 'pl-9 pr-3 text-[13px]' : 'px-3 text-sm',
                active
                  ? 'bg-white/10 text-white font-medium border-l-2 border-coral'
                  : item.disabled
                  ? 'text-white/20 cursor-not-allowed'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className={cn(item.indent ? 'w-3.5 h-3.5' : 'w-4 h-4', active && 'text-coral')} />
              {item.label}
              {item.disabled && (
                <span className="ml-auto text-[10px] text-white/20 font-medium">Soon</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Clients */}
      <Separator className="bg-white/10 mx-3 w-auto" />
      <div className="flex-1 min-h-0 overflow-hidden pt-2">
        <ClientList pathname={pathname} onClose={onClose} />
      </div>

      {/* Footer */}
      <div className="p-4 shrink-0">
        <Separator className="bg-white/10 mb-4" />
        <p className="text-[10px] text-white/20 text-center">
          Brand Purity. Digital Potency.
        </p>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 bg-charcoal flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar with animation */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-60 bg-charcoal flex flex-col lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
