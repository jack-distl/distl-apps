import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useClientView } from '../hooks/useClientView'
import { clientTabs, activeTab } from '../lib/clientTools'

/**
 * The row of tabs at the top of every client screen: Overview, SEO plan,
 * Sitemap. One click between a client's tools. In Client view the internal
 * tabs (the Sitemap) drop out, so the row is the client's own way around
 * their tools.
 */
export function ClientTabs({ client, className }) {
  const { pathname } = useLocation()
  const { clientView } = useClientView()
  if (!client) return null
  const tabs = clientTabs(client, { clientView })
  const current = activeTab(tabs, pathname)
  return (
    <nav aria-label={`${client.name}`} className={cn('mb-6 flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-sage-line print:hidden', className)}>
      {tabs.map(t => (
        <Link
          key={t.id}
          to={t.href}
          aria-current={current === t.id ? 'page' : undefined}
          className={cn('-mb-px border-b-2 pb-2.5 text-sm transition-colors', current === t.id ? 'border-pink font-medium text-ink' : 'border-transparent text-ink-soft hover:text-ink')}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
