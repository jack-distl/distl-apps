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

  async function updateClient(id, fields) {
    if (!supabase) {
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c))
      return
    }

    const { error } = await supabase
      .from('clients')
      .update(fields)
      .eq('id', id)

    if (error) throw new Error('Failed to update client.')
    await fetchClients()
  }

  async function deleteClient(id) {
    if (!supabase) {
      setClients(prev => prev.filter(c => c.id !== id))
      return
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) throw new Error('Failed to delete client.')
    await fetchClients()
  }

  return { clients, loading, error, refetch: fetchClients, addClient, updateClient, deleteClient }
}
