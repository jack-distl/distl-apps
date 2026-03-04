import { LayoutDashboard, Target, Clock, Map, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Separator } from './ui/separator'

const navItems = [
  { label: 'Hub', href: '/', icon: LayoutDashboard },
  { label: 'OKR Planner', href: '/okr', icon: Target },
  { label: 'WFM Hours', href: '/hours', icon: Clock },
  { label: 'Sitemap Tool', href: '/sitemap', icon: Map, disabled: true },
  { label: 'Settings', href: '/settings', icon: Settings, disabled: true },
]

export function Sidebar({ open = false, onClose }) {
  const { pathname } = useLocation()

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
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              to={item.disabled ? '#' : item.href}
              onClick={(e) => {
                if (item.disabled) e.preventDefault()
                else onClose?.()
              }}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-white/10 text-white font-medium border-l-2 border-coral ml-0 pl-[10px]'
                  : item.disabled
                  ? 'text-white/20 cursor-not-allowed'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className={cn('w-4 h-4', active && 'text-coral')} />
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
