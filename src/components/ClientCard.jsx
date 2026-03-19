import { motion } from 'framer-motion'
import { Badge } from './Badge'
import { Card, CardContent } from './ui/card'

export function ClientCard({ client, retainers = {}, apps = [], onSelect }) {
  const seoRetainer = retainers.seo || 0
  const hoursPerMonth = seoRetainer ? Math.round(seoRetainer / 180) : 0

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onSelect?.(client)}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-charcoal">{client.name}</h3>
              <span className="text-sm text-gray-500">{client.abbreviation}</span>
            </div>
            {client.is_active ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge>Inactive</Badge>
            )}
          </div>

          {seoRetainer > 0 && (
            <p className="text-sm text-gray-600 mb-3">
              SEO: ${seoRetainer.toLocaleString()}/mo &middot; ~{hoursPerMonth} hrs
            </p>
          )}

          {apps.length > 0 && (
            <div className="flex gap-1.5">
              {apps.map((app) => (
                <Badge key={app} variant="coral">{app}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
