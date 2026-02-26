import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { mockClients } from '../lib/mockData'

export function useClients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    if (!supabase) {
      // Fallback to mock data when Supabase isn't configured
      setClients(mockClients)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name')

    if (error) {
      setError('Failed to load clients. Please try again.')
    } else {
      setClients(data)
    }
    setLoading(false)
  }

  async function addClient({ name, abbreviation, monthly_retainer }) {
    if (!supabase) {
      // Local fallback — no persistence
      const newClient = {
        id: crypto.randomUUID(),
        name,
        abbreviation,
        monthly_retainer,
        is_active: true,
      }
      setClients(prev => [...prev, newClient])
      return newClient
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({ name, abbreviation, monthly_retainer, is_active: true })
      .select()
      .single()

    if (error) throw new Error('Failed to add client.')
    await fetchClients()
    return data
  }

  return { clients, loading, error, refetch: fetchClients, addClient }
}
