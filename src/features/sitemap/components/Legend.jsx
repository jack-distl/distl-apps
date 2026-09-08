import { Dot, STATUS_VARIANT, BAND_VARIANT } from './Chips'
import { STATUS_META, STATUSES } from '../../../lib/sitemap/tree'
import { POSITION_BANDS } from '../../../lib/sitemap/perf'

export function Legend({ isReview }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
      {isReview ? (
        <>
          {POSITION_BANDS.map(b => (
            <span key={b.key} className="inline-flex items-center gap-1.5"><Dot variant={BAND_VARIANT[b.key]} /> {b.label}</span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="text-green-600 font-semibold">▲</span> change since previous review</span>
          <span className="text-gray-400 italic">Positions shown for the primary keyword. Click a page for the full picture.</span>
        </>
      ) : (
        <>
          {STATUSES.map(s => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <Dot variant={STATUS_VARIANT[s]} /> <b className="font-medium text-gray-600">{STATUS_META[s].label}</b> — {STATUS_META[s].description}
            </span>
          ))}
          <span className="text-gray-400 italic">Click any page to see its keywords and metadata.</span>
        </>
      )}
    </div>
  )
}
