import { useState } from 'react'
import { LayoutDashboard, Target, LayoutTemplate, Map, Settings, Users, ChevronRight, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Separator } from './ui/separator'
import { useClients } from '../hooks/useClients'
import { clientPath, findClientByRef } from '../lib/clientRoutes'

const navItems = [
  { label: 'Hub', href: '/', icon: LayoutDashboard },
  { label: 'Sitemap Tool', href: '/sitemap', icon: Map },
  // The SEO plan lives on each client (Clients, then its tab); its shared
  // objective templates are edited here.
  { label: 'Objective templates', href: '/okr/templates', icon: LayoutTemplate },
  { label: 'Settings', href: '/settings', icon: Settings, disabled: true },
]

function isMatch(href, pathname) {
  return pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
}

// Per-client services linked from the sidebar client list
const CLIENT_SERVICES = [
  { label: 'SEO plan', href: c => clientPath('okr', c), icon: Target },
  { label: 'Sitemap', href: c => clientPath('sitemap', c), icon: Map },
]

function ClientList({ pathname, onClose, collapsed }) {
  const { clients } = useClients()
  const [openId, setOpenId] = useState(null)
  const active = clients.filter(c => c.is_active)
  // Auto-expand the client whose page is open
  const currentRef = pathname.match(/^\/(?:okr|sitemap|clients)\/([^/]+)/)?.[1] || null
  const currentId = findClientByRef(active, currentRef)?.id || null
  const expanded = openId ?? currentId

  // Collapsed rail: just the Clients link, highlighted while inside a client
  if (collapsed) {
    const on = pathname === '/clients' || !!currentId
    return (
      <div className="px-3 pb-2">
        <Link
          to="/clients"
          title={`Clients (${active.length})`}
          aria-label="Clients"
          className={cn(
            'flex items-center justify-center py-2 rounded-lg transition-colors',
            on ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
          )}
        >
          <Users className={cn('w-4 h-4', on && 'text-coral')} />
        </Link>
      </div>
    )
  }

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
              <div
                className={cn(
                  'flex items-center rounded-md transition-colors',
                  isCurrent ? 'text-white' : 'text-white/50 hover:bg-white/5'
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? '' : c.id)}
                  title={isOpen ? 'Hide tools' : 'Show tools'}
                  aria-label={isOpen ? `Hide ${c.name} tools` : `Show ${c.name} tools`}
                  className="pl-4 pr-1 py-1.5 text-white/30 hover:text-white shrink-0"
                >
                  {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                <Link
                  to={clientPath('clients', c)}
                  onClick={() => onClose?.()}
                  title={`${c.name} overview`}
                  className={cn('flex-1 min-w-0 pr-2 py-1.5 text-[13px] truncate hover:text-white', isCurrent ? 'text-white' : 'text-white/50')}
                >
                  {c.name}
                </Link>
              </div>
              {isOpen && (
                <ul className="ml-6 mb-1 border-l border-white/10 pl-2 space-y-0.5">
                  {CLIENT_SERVICES.map(svc => {
                    const href = svc.href(c)
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

export function Sidebar({ open = false, onClose, collapsed = false, onToggleCollapsed }) {
  const { pathname } = useLocation()

  // Sub-items (with a `parent`) only appear while inside that section
  const visibleItems = navItems.filter(
    item => !item.parent || pathname.startsWith(item.parent)
  )

  // Highlight only the most specific matching nav item.
  const activeHref = visibleItems
    .filter(item => !item.disabled && isMatch(item.href, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  // The mobile drawer always shows in full; only the desktop sidebar collapses
  const renderContent = (collapsed) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      {collapsed ? (
        <div className="h-14 flex items-center justify-center shrink-0">
          <img src="/logos/distl-symbol-white.svg" alt="Distl" className="h-6 w-auto" />
        </div>
      ) : (
        <div className="h-14 flex items-center px-5 shrink-0">
          <img
            src="/logos/distl-type-white.svg"
            alt="Distl"
            className="h-5 w-auto"
          />
          <span className="text-white/30 mx-2.5">|</span>
          <span className="text-white/50 text-sm">platform</span>
        </div>
      )}

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
              title={collapsed ? (item.disabled ? `${item.label} (soon)` : item.label) : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 py-2 rounded-lg transition-colors',
                collapsed ? 'justify-center' : item.indent ? 'pl-9 pr-3 text-[13px]' : 'px-3 text-sm',
                active
                  ? cn('bg-white/10 text-white font-medium', !collapsed && 'border-l-2 border-coral')
                  : item.disabled
                  ? 'text-white/20 cursor-not-allowed'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className={cn(item.indent ? 'w-3.5 h-3.5' : 'w-4 h-4', active && 'text-coral')} />
              {!collapsed && item.label}
              {!collapsed && item.disabled && (
                <span className="ml-auto text-[10px] text-white/20 font-medium">Soon</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Clients */}
      <Separator className="bg-white/10 mx-3 w-auto" />
      <div className="flex-1 min-h-0 overflow-hidden pt-2">
        <ClientList pathname={pathname} onClose={onClose} collapsed={collapsed} />
      </div>

      {/* Footer */}
      <div className={cn('shrink-0', collapsed ? 'p-3' : 'p-4')}>
        <Separator className="bg-white/10 mb-4" />
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'w-full flex items-center gap-3 py-2 mb-3 rounded-lg text-sm text-white/40 hover:bg-white/5 hover:text-white transition-colors',
              collapsed ? 'justify-center' : 'px-3'
            )}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {!collapsed && 'Collapse'}
          </button>
        )}
        {!collapsed && (
          <p className="text-[10px] text-white/20 text-center">
            Brand Purity. Digital Potency.
          </p>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn('hidden lg:flex fixed inset-y-0 left-0 z-40 bg-charcoal flex-col transition-[width] duration-200', collapsed ? 'w-16' : 'w-60')}>
        {renderContent(collapsed)}
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
              {renderContent(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
