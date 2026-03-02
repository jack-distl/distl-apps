import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Header, Sidebar, LoginPage, LoadingSpinner } from './components'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import { TemplateProvider } from './contexts/TemplateContext'
import Dashboard from './features/hub/Dashboard'
import Clients from './features/hub/Clients'
import PlannerHome from './features/okr/PlannerHome'
import OkrPlanner from './features/okr/OkrPlanner'
import HoursHome from './features/hours/HoursHome'
import ClientHours from './features/hours/ClientHours'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, loading, signOut } = useAuth()

  // Dev mode: no Supabase configured, allow bypass with mock user
  const [devUser, setDevUser] = useState(null)

  const activeUser = user || devUser

  // Show loading spinner while auth state resolves
  if (supabase && loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Show login page when not authenticated
  if (!activeUser) {
    return (
      <LoginPage
        onDevBypass={() => setDevUser({ email: 'dev@localhost', user_metadata: { name: 'Dev User' } })}
      />
    )
  }

  const displayName = activeUser.user_metadata?.name || activeUser.email || 'Team Member'

  async function handleSignOut() {
    if (supabase) {
      await signOut()
    }
    setDevUser(null)
  }

  return (
    <TemplateProvider>
      <div className="min-h-screen bg-cream">
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          user={{ name: displayName }}
          onSignOut={handleSignOut}
        />
        <div className="flex">
          <Sidebar open={sidebarOpen} />
          <main className="flex-1 p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/okr" element={<PlannerHome />} />
              <Route path="/okr/:clientId" element={<OkrPlanner />} />
              <Route path="/hours" element={<HoursHome />} />
              <Route path="/hours/:clientId" element={<ClientHours />} />
            </Routes>
          </main>
        </div>
      </div>
    </TemplateProvider>
  )
}
