import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, Circle, PenLine, ExternalLink, Download, Upload } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { buildVisualSilos, buildHierarchy, templateLabel } from '@/lib/sitemap/tree'
import {
  normaliseBlocks, parseDetails, dynamicValues, resolveDynamic, isListBullet,
  parseWords, formatWords, countWords, totalWords, wordStatus,
} from '@/lib/sitemap/templateBlocks'

/** Words written and recommended for one page. */
export function pageCopyStats(sitemap, page) {
  const template = sitemap.templates.find(t => t.id === page.template_id)
  const sections = template ? normaliseBlocks(template.blocks) : []
  const copy = sitemap.copy?.[page.id] || {}
  let written = 0, over = 0, started = 0
  for (const sec of sections) {
    const n = countWords(copy[sec.id]?.body)
    written += n
    if (n) started++
    if (wordStatus(n, parseWords(sec.words)) === 'over') over++
  }
  return { template, sections, written, over, started, target: totalWords(sections) }
}

function autosize(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function CopyCard({ sitemap, page, selected, onSelect, onConfirm }) {
  const stats = pageCopyStats(sitemap, page)
  const confirmed = !!page.copy_confirmed
  return (
    <Card
      onClick={() => onSelect(page.id)}
      className={cn(
        'p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-px',
        page.status === 'functional' && 'border-dashed bg-gray-50/60',
        confirmed && 'border-green-300 bg-green-50/40',
        selected && 'ring-2 ring-coral border-coral shadow-md'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-charcoal leading-tight truncate">{page.name}</div>
          <div className="text-[11px] text-gray-400 font-mono truncate mt-0.5">{page.url}</div>
        </div>
        <label onClick={e => e.stopPropagation()} className="shrink-0 inline-flex items-center gap-1 text-[10.5px] text-gray-500 cursor-pointer select-none" title="Tick once the copy is signed off">
          <input type="checkbox" className="accent-[#16a34a]" checked={confirmed} onChange={e => onConfirm(page.id, e.target.checked)} />
          Done
        </label>
      </div>
      <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-gray-500">{stats.template ? stats.template.code || stats.template.name : <span className="italic text-gray-400">No template</span>}</span>
        {stats.template && (
          <span className={cn('shrink-0 tabular-nums', stats.over ? 'text-red-600 font-medium' : 'text-gray-500')}>
            {stats.written}{stats.target ? ` / ${formatWords(stats.target)}` : ''} words
          </span>
        )}
      </div>
      {stats.target && (
        <div className="mt-1.5 h-1 rounded-full bg-gray-100 overflow-hidden">
          <div className={cn('h-full rounded-full', stats.over ? 'bg-red-400' : stats.written >= stats.target.min ? 'bg-green-400' : 'bg-coral/70')} style={{ width: `${Math.min(100, (stats.written / stats.target.max) * 100)}%` }} />
        </div>
      )}
    </Card>
  )
}

function CopySection({ section, values, body, onChange }) {
  const ref = useRef(null)
  useEffect(() => { autosize(ref.current) }, [body])
  const range = parseWords(section.words)
  const n = countWords(body)
  const status = wordStatus(n, range)
  const brief = parseDetails(resolveDynamic(section.details, values))
  const dynamicBrief = String(section.details || '').split('\n').some(l => isListBullet(l, values))
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-[13px] font-semibold text-charcoal">{resolveDynamic(section.title, values) || <span className="italic font-normal text-gray-400">Untitled section</span>}</p>
      {brief.length > 0 && (
        <div className={cn('mt-1 rounded-md px-2 py-1.5 text-[11.5px] leading-snug space-y-px', dynamicBrief ? 'bg-sky-50 text-sky-900' : 'bg-gray-50 text-gray-500')}>
          {brief.map((l, i) => l.kind === 'bullet'
            ? <p key={i} className="flex gap-1.5"><span aria-hidden>•</span><span className="min-w-0">{l.text}</span></p>
            : <p key={i}>{l.text}</p>)}
        </div>
      )}
      <div className="relative mt-2">
        <textarea
          ref={ref}
          rows={2}
          value={body}
          onChange={e => { onChange(e.target.value); autosize(e.target) }}
          placeholder="Write the copy for this section"
          className={cn(
            'block w-full resize-none overflow-hidden rounded-md border px-2.5 py-2 pb-6 text-[13px] leading-relaxed text-gray-800 focus:outline-none focus:ring-2',
            status === 'over' ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:border-coral/50 focus:ring-coral/20'
          )}
        />
        <span className={cn('pointer-events-none absolute bottom-1.5 right-2 text-[10.5px] tabular-nums', status === 'over' ? 'text-red-600 font-medium' : status === 'within' ? 'text-green-600' : 'text-gray-400')}>
          {n}{range ? ` / ${formatWords(range)}` : ''} words
        </span>
      </div>
    </div>
  )
}

/** How often a phrase appears in some text, whole words, any case. */
function timesUsed(text, phrase) {
  const p = String(phrase || '').trim()
  if (!p) return 0
  const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\b`, 'gi')
  return (String(text || '').match(re) || []).length
}

/** The page's keyword cluster, primary first, with how often each appears in the copy so far. */
function PageKeywords({ page, allCopy }) {
  const kws = [...(page.keywords || [])].sort((a, b) => (b.is_primary - a.is_primary) || ((b.volume || 0) - (a.volume || 0)))
  if (!kws.length) {
    return <p className="mt-3 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-400">No keywords on this page yet. Add them in the Sitemap tab.</p>
  }
  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        <span>Keywords for this page</span><span className="font-normal normal-case tracking-normal">volume /mo · used in copy</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {kws.map(k => {
          const n = timesUsed(allCopy, k.keyword)
          return (
            <span key={k.id || k.keyword} title={k.is_primary ? 'Primary keyword' : 'Supporting keyword'} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px]', k.is_primary ? 'border-coral/50 bg-coral-50 text-charcoal font-medium' : 'border-gray-200 bg-gray-50 text-gray-700')}>
              {k.keyword}
              <span className="tabular-nums text-gray-400">{k.volume ?? '—'}</span>
              <span className={cn('tabular-nums rounded-full px-1 text-[10px]', n ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400')}>{n}×</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function CopyPanel({ sitemap, page, hierarchy, onClose, onConfirm, onJumpTemplate, setCopy }) {
  const stats = pageCopyStats(sitemap, page)
  const values = dynamicValues(page, hierarchy, sitemap.dynamic_fields)
  const copy = sitemap.copy?.[page.id] || {}
  const over = stats.target && stats.written > stats.target.max
  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.18 }}
      className="w-[32rem] shrink-0 rounded-xl border border-gray-200 bg-cream shadow-sm p-5 self-start sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-charcoal leading-tight">{page.name}</h2>
          <div className="text-xs text-gray-500 font-mono mt-1">{page.url}</div>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Close"><X size={16} /></button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-gray-500">
          {stats.template
            ? <>Template <button type="button" onClick={() => onJumpTemplate(stats.template.id)} className="inline-flex items-center gap-1 text-charcoal hover:text-coral">{templateLabel(stats.template)} <ExternalLink size={11} /></button></>
            : 'No template yet'}
        </span>
        <button
          type="button"
          onClick={() => onConfirm(page.id, !page.copy_confirmed)}
          className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition-colors', page.copy_confirmed ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:text-green-700')}
        >
          {page.copy_confirmed ? <CheckCircle2 size={13} /> : <Circle size={13} />}
          {page.copy_confirmed ? 'Copy confirmed' : 'Mark as confirmed'}
        </button>
      </div>

      <PageKeywords page={page} allCopy={Object.values(copy).map(c => c.body).join('\n')} />

      {!stats.template || !stats.sections.length ? (
        <div className="mt-4 rounded-lg border-2 border-dashed border-gray-200 px-4 py-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-300">Page wireframe will be added here</p>
          <p className="mt-1 text-xs text-gray-400">Give this page a template in the Sitemap tab, then write its copy here.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-2.5">
            {stats.sections.map(sec => (
              <CopySection key={sec.id} section={sec} values={values} body={copy[sec.id]?.body || ''} onChange={body => setCopy(page.id, sec.id, body)} />
            ))}
          </div>
          <p className={cn('mt-3 text-right text-xs tabular-nums', over ? 'text-red-600 font-medium' : 'text-gray-500')}>
            Page total <b className="font-semibold">{stats.written}</b>{stats.target ? ` of ${formatWords(stats.target)}` : ''} words
          </p>
        </>
      )}
    </motion.aside>
  )
}

/**
 * The sitemap again, as a place to write copy: each page shows its template,
 * words written against the recommended range, and a Done tick. Clicking a
 * page opens its sections, with dynamic fields filled in, to write into.
 */
export function CopyTab({ sitemap, selectedPageId, onSelectPage, onJumpTemplate, actions, onExportBrief, onImportBrief }) {
  const { setCopy, updatePage } = actions
  const { home, silos, functional } = useMemo(() => buildVisualSilos(sitemap.pages), [sitemap.pages])
  const hierarchy = useMemo(() => buildHierarchy(sitemap.pages), [sitemap.pages])
  const [onlyOpen, setOnlyOpen] = useState(false)
  const selected = sitemap.pages.find(p => p.id === selectedPageId) || null
  const confirmedCount = sitemap.pages.filter(p => p.copy_confirmed).length
  const onConfirm = (id, v) => updatePage(id, { copy_confirmed: v }, { immediate: true })
  const show = p => !onlyOpen || !p.copy_confirmed
  const card = p => <CopyCard key={p.id} sitemap={sitemap} page={p} selected={p.id === selectedPageId} onSelect={onSelectPage} onConfirm={onConfirm} />

  if (!sitemap.pages.length) {
    return <p className="text-sm text-gray-500">Add pages in the Sitemap tab first, then write their copy here.</p>
  }

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5"><PenLine size={13} className="text-coral" /> <b className="text-charcoal">{confirmedCount}</b> of {sitemap.pages.length} pages confirmed</span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" className="accent-[#E8806A]" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} /> Hide confirmed pages
          </label>
          <span className="text-gray-400">Red means a section is over its recommended words.</span>
          <span className="flex-1" />
          {onExportBrief && <button type="button" onClick={onExportBrief} className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-charcoal hover:border-coral hover:text-coral"><Download size={13} /> Export brief</button>}
          {onImportBrief && <button type="button" onClick={onImportBrief} className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-charcoal hover:border-coral hover:text-coral"><Upload size={13} /> Import filled brief</button>}
        </div>

        {home && show(home) && <div className="flex justify-center"><div className="w-72">{card(home)}</div></div>}
        <div className="flex justify-center"><div className="w-px h-6 bg-gray-300" /></div>
        <div className="overflow-x-auto pb-4 -mx-1 px-1">
          <div className="w-max min-w-full flex justify-center">
            <div className="flex gap-4 items-start border-t border-gray-300 pt-4">
              {silos.map(({ root, children }) => {
                const kids = children.filter(show)
                if (!show(root) && !kids.length) return null
                return (
                  <div key={root.id} className="w-64 shrink-0">
                    {show(root) ? card(root) : <div className="px-1 text-xs font-medium text-gray-400">{root.name}</div>}
                    {kids.length > 0 && <div className="mt-2 ml-3 pl-3 border-l border-gray-200 space-y-2">{kids.map(card)}</div>}
                  </div>
                )
              })}
              {functional.filter(show).length > 0 && (
                <div className="w-64 shrink-0 ml-2 pl-4 border-l border-dashed border-gray-300">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Functional</div>
                  <div className="space-y-2">{functional.filter(show).map(card)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <CopyPanel
            key={selected.id}
            sitemap={sitemap}
            page={selected}
            hierarchy={hierarchy}
            onClose={() => onSelectPage(null)}
            onConfirm={onConfirm}
            onJumpTemplate={onJumpTemplate}
            setCopy={setCopy}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
