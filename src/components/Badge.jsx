import { Badge as ShadBadge } from './ui/badge'

export function Badge({ children, variant = 'default', className = '' }) {
  return (
    <ShadBadge variant={variant} className={className}>
      {children}
    </ShadBadge>
  )
}
