import { useState } from 'react'
import { RefreshCw, Wifi, WifiOff, Link as LinkIcon } from 'lucide-react'
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
  const { connection, loading: connLoading } = useWfmConnection()
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)

  if (connLoading) return null

  const isConnected = connection?.connected

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await window.fetch('/api/wfm/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      onSyncComplete?.()
    } catch (err) {
      setSyncError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm mb-6">
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
            <a
              href="/api/wfm/connect"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-coral border border-coral/30 rounded-lg hover:bg-coral/5 transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Connect WFM
            </a>
          )}
          {isConnected && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>
      </div>

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
    </div>
  )
}
