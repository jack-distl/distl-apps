import { Badge } from './Badge'

export function ClientCard({ client, apps = [], onSelect }) {
  const hoursPerMonth = client.monthly_retainer ? Math.round(client.monthly_retainer / 180) : 0

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect?.(client)}
    >
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

      {client.monthly_retainer && (
        <p className="text-sm text-gray-600 mb-3">
          ${client.monthly_retainer.toLocaleString()}/mo &middot; ~{hoursPerMonth} hrs
        </p>
      )}

      {apps.length > 0 && (
        <div className="flex gap-1.5">
          {apps.map((app) => (
            <Badge key={app} variant="coral">{app}</Badge>
          ))}
        </div>
      )}
    </div>
  )
}
