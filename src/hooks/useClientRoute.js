import { useParams } from 'react-router-dom'
import { useClients } from './useClients'
import { findClientByRef } from '../lib/clientRoutes'

/**
 * For pages under /okr/:clientRef, /sitemap/:clientRef, /clients/:clientRef
 * and the other per-client routes. Returns everything useClients() returns
 * plus the client the URL names and its id (null until the list has loaded,
 * or when nothing matches).
 */
export function useClientRoute() {
  const { clientRef } = useParams()
  const clientsState = useClients()
  const client = findClientByRef(clientsState.clients, clientRef) || null
  return { ...clientsState, clientRef, client, clientId: client?.id ?? null, clientsLoading: clientsState.loading }
}
