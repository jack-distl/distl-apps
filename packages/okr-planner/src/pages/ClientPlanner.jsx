import { useParams } from 'react-router-dom'
import { LoadingSpinner } from '@distl/shared/components'

export default function ClientPlanner() {
  const { clientId } = useParams()

  // Placeholder until Supabase is connected
  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">Client OKR Plan</h1>
        <p className="text-gray-500 mt-1">Client ID: {clientId}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm text-center">
        <p className="text-gray-500">
          OKR planning interface will be built here. This will include:
        </p>
        <ul className="text-sm text-gray-400 mt-4 space-y-1">
          <li>Period selector (Q1, Q2, etc.)</li>
          <li>Hour allocation breakdown</li>
          <li>Objectives and tasks editor</li>
          <li>AM vs SEO hour split tracking</li>
          <li>Internal / Client view toggle</li>
        </ul>
      </div>
    </div>
  )
}
