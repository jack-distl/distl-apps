import { Users } from 'lucide-react'
import { EmptyState, Button } from '@distl/shared/components'

export default function Clients() {
  // Placeholder until Supabase is connected
  const clients = []

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No clients yet"
        description="Clients will appear here once the database is connected."
        action={<Button variant="primary">Connect Supabase</Button>}
      />
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-charcoal mb-6">Clients</h1>
      {/* Client list will go here */}
    </div>
  )
}
