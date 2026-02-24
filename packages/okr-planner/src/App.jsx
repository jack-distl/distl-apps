import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Header, Sidebar } from '@distl/shared/components'
import PlannerHome from './pages/PlannerHome'
import ClientPlanner from './pages/ClientPlanner'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const user = { name: 'Team Member' }

  return (
    <div className="min-h-screen bg-cream">
      <Header
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        user={user}
      />
      <div className="flex">
        <Sidebar currentPath="/okr" open={sidebarOpen} />
        <main className="flex-1 p-6 lg:p-8">
          <Routes>
            <Route path="/okr" element={<PlannerHome />} />
            <Route path="/okr/:clientId" element={<ClientPlanner />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
