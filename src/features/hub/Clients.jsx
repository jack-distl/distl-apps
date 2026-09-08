import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, LayoutGrid, List, Pencil, Trash2, Target, Map as MapIcon } from 'lucide-react'
import { ClientCard, ClientEditModal, LoadingSpinner, NewClientModal, ConfirmDialog } from '../../components'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table'
import { useClients, fetchAllClientRetainers } from '../../hooks'
import { mockClientRetainers } from '../../lib/mockData'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

const VIEW_KEY = 'distl.clients.view'

function readView() {
  try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid' } catch { return 'grid' }
}

export default function Clients() {
  const navigate = useNavigate()
  const { clients, loading, addClient, updateClient, deleteClient } = useClients()
  const [retainersByClient, setRetainersByClient] = useState(null)
  const [editingClient, setEditingClient] = useState(null)
  const [deletingClient, setDeletingClient] = useState(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [view, setView] = useState(readView)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    fetchAllClientRetainers().then(data => {
      setRetainersByClient(data || mockClientRetainers)
    })
  }, [])

  function changeView(v) {
    setView(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch { /* ignore */ }
  }

  async function confirmDelete() {
    if (!deletingClient) return
    setDeleteError(null)
    try {
      await deleteClient(deletingClient.id)
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete client.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  const sorted = [...clients].sort((a, b) => (Number(b.is_active) - Number(a.is_active)) || a.name.localeCompare(b.name))

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Clients</h1>
          <p className="text-gray-500 mt-1">{clients.length} clients total</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => changeView('grid')}
              title="Grid"
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${view === 'grid' ? 'bg-white text-charcoal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid size={14} /> Grid
            </button>
            <button
              type="button"
              onClick={() => changeView('list')}
              title="List"
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-white text-charcoal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List size={14} /> List
            </button>
          </div>
          <Button onClick={() => setShowNewClient(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Client
          </Button>
        </div>
      </div>

      {deleteError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{deleteError}</div>
      )}

      {view === 'grid' ? (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
        >
          {sorted.map((client) => (
            <motion.div key={client.id} variants={fadeUp}>
              <ClientCard
                client={client}
                retainers={retainersByClient?.[client.id] || {}}
                apps={client.is_active ? ['OKR', 'Sitemap'] : []}
                onSelect={() => navigate(`/okr/${client.id}`)}
                onEdit={setEditingClient}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Client</TableHead>
                <TableHead>Abbr.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">SEO retainer</TableHead>
                <TableHead>Tools</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(client => {
                const seo = retainersByClient?.[client.id]?.seo || 0
                return (
                  <TableRow key={client.id} className={!client.is_active ? 'text-gray-400' : ''}>
                    <TableCell className="font-medium text-charcoal">{client.name}</TableCell>
                    <TableCell className="text-gray-500">{client.abbreviation}</TableCell>
                    <TableCell>{client.is_active ? <Badge variant="success">Active</Badge> : <Badge>Inactive</Badge>}</TableCell>
                    <TableCell className="text-right tabular-nums">{seo ? `$${seo.toLocaleString()}/mo` : <span className="text-gray-300">—</span>}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs">
                        <Link to={`/okr/${client.id}`} className="inline-flex items-center gap-1 text-gray-500 hover:text-coral"><Target size={12} /> OKR</Link>
                        <span className="text-gray-200">|</span>
                        <Link to={`/sitemap/${client.id}`} className="inline-flex items-center gap-1 text-gray-500 hover:text-coral"><MapIcon size={12} /> Sitemap</Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => setEditingClient(client)} title="Edit client" className="p-1.5 rounded-md text-gray-400 hover:text-charcoal hover:bg-gray-100"><Pencil size={14} /></button>
                        <button type="button" onClick={() => setDeletingClient(client)} title="Delete client" className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {!sorted.length && (
                <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">No clients yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <NewClientModal
        open={showNewClient}
        onClose={() => setShowNewClient(false)}
        addClient={addClient}
        onAdded={(client, seoAmount) => {
          if (client && seoAmount > 0) setRetainersByClient(prev => ({ ...prev, [client.id]: { seo: seoAmount } }))
        }}
      />

      <ClientEditModal
        client={editingClient}
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        onSaved={async () => {
          const data = await fetchAllClientRetainers()
          if (data) setRetainersByClient(data)
          setEditingClient(null)
        }}
        onDeleted={() => setEditingClient(null)}
        updateClient={updateClient}
        deleteClient={deleteClient}
      />

      <ConfirmDialog
        open={!!deletingClient}
        onClose={() => setDeletingClient(null)}
        onConfirm={confirmDelete}
        title={`Delete ${deletingClient?.name}?`}
        message="This permanently deletes the client along with their OKR periods and sitemap. This cannot be undone. If you just want them out of the way, edit the client and mark them inactive instead."
      />
    </div>
  )
}
