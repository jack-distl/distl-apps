import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { LoadingSpinner } from '../../components'
import { Input } from '../../components/ui/input'
import { useClients } from '../../hooks'
import { useWfmJobs } from '../../hooks/useWfmData'
import { JobCard } from './components/JobCard'

const FILTERS = ['All', 'Active', 'Completed']

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function ClientHours() {
  const { clientId } = useParams()
  const { clients } = useClients()
  const client = clients.find(c => c.id === clientId)
  const { jobs, loading, error } = useWfmJobs(clientId)

  const [filter, setFilter] = useState('Active')
  const [search, setSearch] = useState('')

  const filteredJobs = useMemo(() => {
    let result = jobs

    if (filter === 'Active') {
      result = result.filter(j => j.state !== 'Completed')
    } else if (filter === 'Completed') {
      result = result.filter(j => j.state === 'Completed')
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(j =>
        j.name.toLowerCase().includes(q) ||
        (j.wfm_job_number && j.wfm_job_number.toLowerCase().includes(q))
      )
    }

    return result
  }, [jobs, filter, search])

  // Aggregate stats
  const activeJobs = jobs.filter(j => j.state !== 'Completed')
  const totalAllocated = activeJobs.reduce((sum, j) => sum + Number(j.allocated_hours), 0)
  const totalUsed = activeJobs.reduce((sum, j) => sum + Number(j.used_hours), 0)
  const totalRemaining = activeJobs.reduce((sum, j) => sum + Number(j.remaining_hours), 0)

  if (loading) {
    return (
      <div className="max-w-4xl flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <Link
        to="/hours"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-coral transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to WFM Hours
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-charcoal">
          {client?.name || 'Client'}
        </h1>
        {activeJobs.length > 0 && (
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>{activeJobs.length} active job{activeJobs.length !== 1 ? 's' : ''}</span>
            <span className="text-gray-300">|</span>
            <span>{totalAllocated.toFixed(1)}h allocated</span>
            <span className="text-gray-300">|</span>
            <span>{totalUsed.toFixed(1)}h used</span>
            <span className="text-gray-300">|</span>
            <span className={totalRemaining < 0 ? 'text-red-600 font-medium' : ''}>
              {totalRemaining.toFixed(1)}h remaining
            </span>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Jobs list */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">
            {jobs.length === 0
              ? 'No jobs found for this client. Try syncing from WorkflowMax.'
              : 'No jobs match your filter.'}
          </p>
        </div>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {filteredJobs.map(job => (
            <motion.div key={job.id} variants={fadeUp}>
              <JobCard job={job} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
