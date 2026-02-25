import { useNavigate } from 'react-router-dom'
import { ClientCard } from '../../components'
import { mockClients } from '../../lib/mockData'

export default function Clients() {
  const navigate = useNavigate()

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">Clients</h1>
        <p className="text-gray-500 mt-1">{mockClients.length} clients total</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockClients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            apps={client.is_active ? ['OKR'] : []}
            onSelect={() => navigate(`/okr/${client.id}`)}
          />
        ))}
      </div>
    </div>
  )
}
