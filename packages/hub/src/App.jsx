import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Header, Sidebar } from '@distl/shared/components'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'

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
        <Sidebar currentPath={window.location.pathname} open={sidebarOpen} />
        <main className="flex-1 p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
