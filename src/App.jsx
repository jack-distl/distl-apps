import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Header, Sidebar } from './components'
import Dashboard from './features/hub/Dashboard'
import Clients from './features/hub/Clients'
import PlannerHome from './features/okr/PlannerHome'
import ClientPlanner from './features/okr/ClientPlanner'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Placeholder user until auth is wired up
  const user = { name: 'Team Member' }

  return (
    <div className="min-h-screen bg-cream">
      <Header
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        user={user}
      />
      <div className="flex">
        <Sidebar open={sidebarOpen} />
        <main className="flex-1 p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/okr" element={<PlannerHome />} />
            <Route path="/okr/:clientId" element={<ClientPlanner />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
