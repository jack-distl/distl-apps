import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Header, Sidebar, LoginPage, LoadingSpinner, AuthCallback, SetPassword } from './components'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import { TemplateProvider } from './contexts/TemplateContext'
import Dashboard from './features/hub/Dashboard'
import Clients from './features/hub/Clients'
import PlannerHome from './features/okr/PlannerHome'
import OkrPlanner from './features/okr/OkrPlanner'
import HoursHome from './features/hours/HoursHome'
import ClientHours from './features/hours/ClientHours'

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, loading, signOut } = useAuth()
  const location = useLocation()

  // Dev mode: no Supabase configured, allow bypass with mock user
  const [devUser, setDevUser] = useState(null)

  const activeUser = user || devUser

  // Auth callback route must be accessible before auth resolves
  if (location.pathname === '/auth/callback') {
    return <AuthCallback />
  }

  // Show loading spinner while auth state resolves
  if (supabase && loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Set-password page requires an active session but sits outside the main layout
  if (location.pathname === '/auth/set-password' && activeUser) {
    return <SetPassword />
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
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:pl-60">
          <Header
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            user={{ name: displayName, email: activeUser.email }}
            onSignOut={handleSignOut}
          />
          <main className="p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} {...pageTransition}>
                <Routes location={location}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/okr" element={<PlannerHome />} />
                  <Route path="/okr/:clientId" element={<OkrPlanner />} />
                  <Route path="/hours" element={<HoursHome />} />
                  <Route path="/hours/:clientId" element={<ClientHours />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </TemplateProvider>
  )
}
