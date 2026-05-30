import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { LoadingSpinner } from '../../components'
import { usePublicBoard } from '../../hooks'
import { STATUS_META, PHASE_META } from '../../lib/blueprintConstants'

// Read-only, no login. Reached only by share token when sharing is enabled.
// Exposes one client's board and nothing else (the RPC enforces this).
export default function BlueprintClientView() {
  const { token } = useParams()
  const { board, loading, error } = usePublicBoard(token)

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-2xl font-bold italic text-coral tracking-tight">distl</p>
          <p className="text-gray-500 mt-4">This blueprint isn't available.</p>
          <p className="text-gray-400 text-sm mt-1">The link may be turned off or incorrect.</p>
        </div>
      </div>
    )
  }

  const domains = [...(board.domains || [])].sort((a, b) => a.sort_order - b.sort_order)
  const elements = board.elements || []
  const byDomain = (domainId) =>
    elements.filter(e => e.domain_id === domainId).sort((a, b) => a.sort_order - b.sort_order)

  // Focus first: lead with the live priorities (in place, underway, or marked "now").
  const focus = elements
    .filter(e => e.status === 'green' || e.status === 'amber' || e.phase === 'now')
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <div className="bg-charcoal px-6 py-16 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-medium mb-6">Prepared by Distl</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            {board.client_name}
          </h1>
          <div className="flex justify-center mt-6"><div className="w-16 bg-coral rounded-full" style={{ height: 3 }} /></div>
          {board.goal_statement && (
            <p className="text-lg md:text-xl text-gray-300 font-light italic max-w-2xl mx-auto leading-relaxed mt-6">
              "{board.goal_statement}"
            </p>
          )}
        </div>
      </div>

      {/* Status legend */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {Object.entries(STATUS_META).map(([key, m]) => (
            <span key={key} className="inline-flex items-center gap-2 text-sm text-gray-500">
              <span className={cn('w-2.5 h-2.5 rounded-full', m.dot)} />
              <span className="font-medium text-charcoal">{m.label}</span>
              <span className="text-gray-400 hidden sm:inline">— {m.help}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Current focus */}
      {focus.length > 0 && (
        <div className="px-6 pt-12">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-semibold text-charcoal">Where we're focused now</h2>
            <div className="w-12 bg-coral rounded-full mt-2 mb-6" style={{ height: 3 }} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {focus.map(el => <ElementCard key={`focus-${el.id}`} element={el} defaultOpen />)}
            </div>
          </div>
        </div>
      )}

      {/* Full board */}
      <div className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-charcoal">The full picture</h2>
          <p className="text-gray-500 mt-1">Everything that makes a business unstoppable in your industry, and where you sit on each.</p>
          <div className="w-12 bg-coral rounded-full mt-2 mb-8" style={{ height: 3 }} />

          <div className="space-y-10">
            {domains.map(domain => {
              const els = byDomain(domain.id)
              if (!els.length) return null
              return (
                <section key={domain.id}>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-charcoal">{domain.name}</h3>
                    {domain.outcome_line && <p className="text-sm text-gray-400">{domain.outcome_line}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {els.map(el => <ElementCard key={el.id} element={el} />)}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-10 text-center bg-white border-t border-gray-100">
        <p className="text-2xl font-bold italic text-coral tracking-tight">distl</p>
        <p className="text-sm text-gray-400 mt-1">Brand Purity. Digital Potency.</p>
      </div>
    </div>
  )
}

function ElementCard({ element, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const meta = STATUS_META[element.status] || STATUS_META.grey
  const hasDetail = element.why || element.recommend || element.examples

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => hasDetail && setOpen(o => !o)}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <span className={cn('mt-1.5 w-3 h-3 rounded-full shrink-0', meta.dot)} title={meta.label} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-charcoal leading-snug">{element.title}</p>
          {element.recommend && <p className="text-sm text-coral mt-0.5">{element.recommend}</p>}
          <div className="flex items-center gap-2 mt-1.5">
            <span className={cn('text-[11px] px-1.5 py-0.5 rounded-full', meta.chip)}>{meta.label}</span>
            {element.phase && PHASE_META[element.phase] && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-cream text-gray-500 border border-gray-200">
                {PHASE_META[element.phase].label}
              </span>
            )}
          </div>
        </div>
        {hasDetail && (
          <ChevronDown className={cn('w-4 h-4 text-gray-300 shrink-0 transition-transform', open && 'rotate-180')} />
        )}
      </button>

      {open && hasDetail && (
        <div className="px-4 pb-4 pl-10 space-y-3">
          {element.why && <Detail label="Why it matters" text={element.why} />}
          {element.recommend && <Detail label="What we'd recommend" text={element.recommend} />}
          {element.examples && <Detail label="Example inclusions" text={element.examples} />}
        </div>
      )}
    </div>
  )
}

function Detail({ label, text }) {
  // Linkify plain URLs in the text (plain text + plain URLs only).
  const parts = String(text).split(/(\bhttps?:\/\/[^\s]+)/g)
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
        {parts.map((part, i) =>
          /^https?:\/\//.test(part)
            ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-coral underline break-all">{part}</a>
            : <span key={i}>{part}</span>
        )}
      </p>
    </div>
  )
}
