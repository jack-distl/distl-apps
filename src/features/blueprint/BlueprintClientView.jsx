import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { STATUS_META, PHASE_META } from '../../lib/blueprintConstants'

// Clean, read-only, client-facing view. Props-driven (no token / route).
// Mirrors the backend structure: the five domains as side-by-side columns,
// with bigger, bolder column headings.
export default function BlueprintClientView({ clientName, goal, domains = [], elements = [] }) {
  const sortedDomains = [...domains]
    .filter(d => d.is_active !== false)
    .sort((a, b) => a.sort_order - b.sort_order)

  const byDomain = (domainId) =>
    elements
      .filter(e => e.domain_id === domainId)
      .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="bg-cream rounded-xl overflow-hidden">
      {/* Hero */}
      <div className="bg-charcoal px-6 py-12 md:py-16 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-medium mb-5">Prepared by Distl</p>
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{clientName}</h1>
        <div className="flex justify-center mt-5"><div className="w-16 bg-coral rounded-full" style={{ height: 3 }} /></div>
        {goal && (
          <p className="text-lg md:text-xl text-gray-300 font-light italic max-w-2xl mx-auto leading-relaxed mt-5">
            "{goal}"
          </p>
        )}
      </div>

      {/* Status legend */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {Object.entries(STATUS_META).map(([key, m]) => (
            <span key={key} className="inline-flex items-center gap-2 text-sm text-gray-500">
              <span className={cn('w-2.5 h-2.5 rounded-full', m.dot)} />
              <span className="font-medium text-charcoal">{m.label}</span>
              <span className="text-gray-400 hidden md:inline">— {m.help}</span>
            </span>
          ))}
        </div>
      </div>

      {/* The five columns, mirroring the backend */}
      <div className="px-4 md:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-5">
          {sortedDomains.map(domain => {
            const els = byDomain(domain.id)
            return (
              <div key={domain.id} className="flex flex-col">
                {/* Bigger, bolder column heading */}
                <div className="mb-4">
                  <h2 className="text-lg md:text-xl font-extrabold text-charcoal leading-tight tracking-tight">
                    {domain.name}
                  </h2>
                  <div className="w-10 bg-coral rounded-full mt-2" style={{ height: 3 }} />
                  {domain.outcome_line && (
                    <p className="text-xs text-gray-400 mt-2 leading-snug">{domain.outcome_line}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {els.length === 0 ? (
                    <p className="text-xs text-gray-300">—</p>
                  ) : (
                    els.map(el => <ElementCard key={el.id} element={el} />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 text-center bg-white border-t border-gray-100">
        <p className="text-2xl font-bold italic text-coral tracking-tight">distl</p>
        <p className="text-sm text-gray-400 mt-1">Brand Purity. Digital Potency.</p>
      </div>
    </div>
  )
}

function ElementCard({ element }) {
  const [open, setOpen] = useState(false)
  const meta = STATUS_META[element.status] || STATUS_META.grey
  const hasDetail = element.why || element.recommend || element.examples

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => hasDetail && setOpen(o => !o)}
        className="w-full text-left p-3 flex items-start gap-2.5"
      >
        <span className={cn('mt-1 w-3 h-3 rounded-full shrink-0', meta.dot)} title={meta.label} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-charcoal text-sm leading-snug">{element.title}</p>
          {element.recommend && <p className="text-xs text-coral mt-0.5">{element.recommend}</p>}
          <div className="flex items-center gap-1.5 mt-1.5">
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
        <div className="px-3 pb-3 space-y-2.5">
          {element.why && <Detail label="Why it matters" text={element.why} />}
          {element.recommend && <Detail label="What we'd recommend" text={element.recommend} />}
          {element.examples && <Detail label="Example inclusions" text={element.examples} />}
        </div>
      )}
    </div>
  )
}

function Detail({ label, text }) {
  // Linkify plain URLs (plain text + plain URLs only).
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
