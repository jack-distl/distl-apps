import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ClientCard, ClientEditModal, LoadingSpinner } from '../../components'
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

export default function Clients() {
  const navigate = useNavigate()
  const { clients, loading, updateClient, deleteClient } = useClients()
  const [retainersByClient, setRetainersByClient] = useState(null)
  const [editingClient, setEditingClient] = useState(null)

  useEffect(() => {
    fetchAllClientRetainers().then(data => {
      setRetainersByClient(data || mockClientRetainers)
    })
  }, [])

  if (loading) {
    return (
      <div className="max-w-5xl flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">Clients</h1>
        <p className="text-gray-500 mt-1">{clients.length} clients total</p>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {clients.map((client) => (
          <motion.div key={client.id} variants={fadeUp}>
            <ClientCard
              client={client}
              retainers={retainersByClient?.[client.id] || {}}
              apps={client.is_active ? ['OKR'] : []}
              onSelect={() => navigate(`/okr/${client.id}`)}
              onEdit={setEditingClient}
            />
          </motion.div>
        ))}
      </motion.div>

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
    </div>
  )
}
