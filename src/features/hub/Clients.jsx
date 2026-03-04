import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ClientCard, LoadingSpinner } from '../../components'
import { useClients } from '../../hooks'

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
  const { clients, loading } = useClients()

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
              apps={client.is_active ? ['OKR'] : []}
              onSelect={() => navigate(`/okr/${client.id}`)}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
