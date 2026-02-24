import { Target } from 'lucide-react'
import { EmptyState, Button } from '@distl/shared/components'
import { HOURLY_RATE } from '@distl/shared/lib'

export default function PlannerHome() {
  // Placeholder until Supabase is connected
  const clients = []

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">OKR Planner</h1>
        <p className="text-gray-500 mt-1">
          Plan quarterly objectives and allocate retainer hours (${HOURLY_RATE}/hr)
        </p>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No plans yet"
          description="Select a client to start planning their quarterly OKRs."
          action={<Button>Select Client</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Client OKR cards will go here */}
        </div>
      )}
    </div>
  )
}
