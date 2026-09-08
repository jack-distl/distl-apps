import { LayoutDashboard, Target, LayoutTemplate, Clock, Map, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Separator } from './ui/separator'

const navItems = [
  { label: 'Hub', href: '/', icon: LayoutDashboard },
  { label: 'OKR Planner', href: '/okr', icon: Target },
  // Sub-item of OKR Planner: only shown while in the OKR area, indented
  { label: 'Edit Templates', href: '/okr/templates', icon: LayoutTemplate, parent: '/okr', indent: true },
  { label: 'WFM Hours', href: '/hours', icon: Clock },
  { label: 'Sitemap Tool', href: '/sitemap', icon: Map },
  { label: 'Settings', href: '/settings', icon: Settings, disabled: true },
]

function isMatch(href, pathname) {
  return pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
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
      <nav className="flex-1 p-3 space-y-1 mt-2">
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
