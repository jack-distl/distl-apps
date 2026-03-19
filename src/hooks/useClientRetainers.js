import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { mockClientRetainers } from '../lib/mockData'

const SERVICE_TYPES = ['seo', 'google_ads', 'social_media', 'programmatic', 'email', 'branding', 'web']

const SERVICE_LABELS = {
  seo: 'SEO',
  google_ads: 'Google Ads',
  social_media: 'Social Media',
  programmatic: 'Programmatic',
  email: 'Email',
  branding: 'Branding',
  web: 'Web',
}

export { SERVICE_TYPES, SERVICE_LABELS }

export function useClientRetainers(clientId) {
  const [retainers, setRetainers] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchRetainers = useCallback(async () => {
    if (!clientId) {
      setRetainers({})
      setLoading(false)
      return
    }

    if (!supabase) {
      setRetainers(mockClientRetainers?.[clientId] || {})
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('client_retainers')
      .select('*')
      .eq('client_id', clientId)

    if (error) {
      console.error('Failed to load retainers:', error)
    } else {
      const map = {}
      for (const row of data || []) {
        map[row.service_type] = row.monthly_amount
      }
      setRetainers(map)
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetchRetainers()
  }, [fetchRetainers])

  const setRetainer = useCallback(async (serviceType, amount) => {
    if (!clientId) return

    // Optimistic update
    setRetainers(prev => ({ ...prev, [serviceType]: amount }))

    if (!supabase) return

    const { error } = await supabase
      .from('client_retainers')
      .upsert({
        client_id: clientId,
        service_type: serviceType,
        monthly_amount: amount,
      }, { onConflict: 'client_id,service_type' })

    if (error) {
      console.error('Failed to save retainer:', error)
      // Revert on failure
      fetchRetainers()
    }
  }, [clientId, fetchRetainers])

  const seoRetainer = retainers.seo || 0

  return { retainers, seoRetainer, loading, setRetainer, refetch: fetchRetainers }
}

// Lightweight fetch for all clients' retainers (used by PlannerHome, Dashboard)
export async function fetchAllClientRetainers() {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('client_retainers')
    .select('client_id, service_type, monthly_amount')

  if (error) {
    console.error('fetchAllClientRetainers error:', error)
    return null
  }

  // Group by client_id: { clientId: { seo: 5400, google_ads: 2000, ... } }
  const byClient = {}
  for (const row of data || []) {
    if (!byClient[row.client_id]) byClient[row.client_id] = {}
    byClient[row.client_id][row.service_type] = row.monthly_amount
  }
  return byClient
}
