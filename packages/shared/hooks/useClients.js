import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useClients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name')

    if (error) {
      setError(error)
    } else {
      setClients(data)
    }
    setLoading(false)
  }

  return { clients, loading, error, refetch: fetchClients }
}
