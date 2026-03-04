import { useState } from 'react'
import { RefreshCw, Link as LinkIcon } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { useWfmConnection } from '../../../hooks/useWfmData'

function timeAgo(dateStr) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function SyncStatusPanel({ onSyncComplete }) {
  const { connection, loading: connLoading, refetch } = useWfmConnection()
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const [syncResult, setSyncResult] = useState(null)

  if (connLoading) return null

  const isConnected = connection?.connected

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    setSyncResult(null)
    try {
      const res = await window.fetch('/api/wfm/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      setSyncResult(`Synced ${data.jobsSynced || 0} jobs`)
      await refetch()
      onSyncComplete?.()
    } catch (err) {
      setSyncError(err.message)
      await refetch()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600">
                  Connected to WorkflowMax
                </span>
                {connection?.connection?.lastSyncAt && (
                  <span className="text-xs text-gray-400">
                    · Last sync: {timeAgo(connection.connection.lastSyncAt)}
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-gray-300" />
                <span className="text-sm text-gray-500">Not connected</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isConnected && (
              <Button variant="outline" size="sm" asChild>
                <a href="/api/wfm/connect">
                  <LinkIcon className="w-3.5 h-3.5 mr-2" />
                  Connect WFM
                </a>
              </Button>
            )}
            {isConnected && (
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            )}
          </div>
        </div>

        {syncResult && !syncError && (
          <div className="mt-3 p-2.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg">
            {syncResult}
          </div>
        )}

        {syncError && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            Sync failed: {syncError}
          </div>
        )}

        {connection?.connection?.lastSyncStatus === 'error' && !syncError && (
          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg">
            Last sync had an error: {connection.connection.lastSyncError}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
