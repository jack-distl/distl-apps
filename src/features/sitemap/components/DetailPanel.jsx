import { X, ExternalLink, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { EditableText, FieldEditor } from './Editable'
import { StatusChip, ChangeIndicator } from './Chips'
import { KeywordTable } from './KeywordTable'
import { STATUS_META, STATUSES, normaliseUrl, cascadeUrlChange, templateLabel, formatNumber } from '@/lib/sitemap/tree'
import { hasPerf, pagePerfSummary, averagePosition, previousReview, pageClickBreakdown, change } from '@/lib/sitemap/perf'
import { cn } from '@/lib/utils'

function Section({ label, hint, children, className }) {
  return (
    <div className={cn('pt-4 mt-4 border-t border-gray-100', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function DetailPanel({ sitemap, version, page, onClose, onJumpTemplate, onDeletePage, actions }) {
  const { updatePage, updatePageUrl, addKeyword, updateKeyword, setPrimaryKeyword, deleteKeyword } = actions
  const isReview = version?.type === 'review'
  const showPerf = isReview && hasPerf(version, page)
  const template = sitemap.templates.find(t => t.id === page.template_id) || null

  function commitUrl(raw) {
    const next = normaliseUrl(raw)
    if (next === normaliseUrl(page.url)) return
    if (sitemap.pages.some(p => p.id !== page.id && normaliseUrl(p.url) === next)) {
      window.alert(`Another page already uses ${next}.`)
      return
    }
    const children = cascadeUrlChange(sitemap.pages, page.url, next)
    let cascade = false
    if (children.length) {
      cascade = window.confirm(
        `${children.length} page${children.length === 1 ? '' : 's'} sit${children.length === 1 ? 's' : ''} under ${page.url}.\n\nAlso update ${children.length === 1 ? 'its' : 'their'} URL${children.length === 1 ? '' : 's'} to start with ${next}?\n\nOK = update children too. Cancel = only change this page.`
      )
    }
    updatePageUrl(page.id, next, { cascade })
  }

  // ─── Review data ───────────────────────────────────────
  let perfBlock = null
  if (showPerf) {
    const summary = pagePerfSummary(sitemap, version, page)
    const avg = averagePosition(version, page)
    const prev = previousReview(sitemap, version)
    const breakdown = pageClickBreakdown(version, page.id)
    const prevBreakdown = prev ? pageClickBreakdown(prev, page.id) : null
    const prevHad = prev ? hasPerf(prev, page) : false
    const prevQueryClicks = q => {
      if (!prevHad) return null
      const hit = prevBreakdown.queries.find(x => x.query === q.query)
      return hit ? hit.clicks : null
    }
    const uploads = version.uploads || []
    const rankUpload = uploads.find(u => u.kind === 'rankings')
    const gscUpload = uploads.find(u => u.kind === 'gsc_queries') || uploads.find(u => u.kind === 'gsc_pages')

    perfBlock = (
      <>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-2xl font-semibold text-charcoal tabular-nums">{avg ?? '—'}</div>
            <div className="text-[11px] text-gray-500">Avg position{rankUpload ? ` · ${fmtDate(rankUpload.uploaded_at)}` : ''}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-2xl font-semibold text-charcoal tabular-nums flex items-baseline gap-2">
              {formatNumber(summary.clicks)} <ChangeIndicator change={summary.clicksChange} />
            </div>
            <div className="text-[11px] text-gray-500">Clicks (period)</div>
          </div>
        </div>

        <Section label="Search Console queries" hint={gscUpload ? `GSC · ${fmtDate(gscUpload.uploaded_at)}` : 'GSC'}>
          {breakdown.queries.length === 0 && breakdown.total === 0 ? (
            <p className="text-xs text-gray-400 italic">No Search Console data matched this page.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-400">
                  <th className="text-left font-semibold pb-1.5">Query</th>
                  <th className="text-right font-semibold pb-1.5">Clicks</th>
                  <th className="text-right font-semibold pb-1.5">Change</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.queries.map(q => (
                  <tr key={q.id || q.query} className="border-t border-gray-100">
                    <td className="py-1.5 text-gray-700">{q.query}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatNumber(q.clicks)}</td>
                    <td className="py-1.5 text-right"><ChangeIndicator change={change(q.clicks, prevQueryClicks(q))} /></td>
                  </tr>
                ))}
                <tr className="border-t border-gray-100 text-gray-500 italic">
                  <td className="py-1.5">Additional clicks from anonymous queries</td>
                  <td className="py-1.5 text-right tabular-nums">{formatNumber(breakdown.anonymous)}</td>
                  <td className="py-1.5 text-right"><ChangeIndicator change={change(breakdown.anonymous, prevHad ? prevBreakdown.anonymous : null)} /></td>
                </tr>
                <tr className="border-t border-gray-200 font-semibold text-charcoal">
                  <td className="py-1.5">Total page clicks</td>
                  <td className="py-1.5 text-right tabular-nums">{formatNumber(breakdown.total)}</td>
                  <td className="py-1.5 text-right"><ChangeIndicator change={summary.clicksChange} /></td>
                </tr>
              </tbody>
            </table>
          )}
        </Section>
      </>
    )
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.18 }}
      className="w-[26rem] shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm p-5 self-start sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={page.status} onValueChange={v => updatePage(page.id, { status: v }, { immediate: true })}>
            <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 gap-1 [&>svg]:opacity-40">
              <StatusChip status={page.status} />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex rounded-md border border-gray-200 text-[10px] overflow-hidden">
            {['page', 'post'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => updatePage(page.id, { post_type: t }, { immediate: true })}
                className={cn('px-1.5 py-0.5 uppercase tracking-wider', (page.post_type || 'page') === t ? 'bg-charcoal text-white' : 'text-gray-400 hover:bg-gray-50')}
                title="WordPress post type"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Close"><X size={16} /></button>
      </div>

      <h2 className="text-lg font-semibold text-charcoal mt-3 leading-tight">
        <EditableText value={page.name} onChange={v => v && updatePage(page.id, { name: v })} />
      </h2>
      <div className="text-xs text-gray-500 font-mono mt-1">
        <EditableText value={page.url} onChange={commitUrl} title="Click to edit URL. Children can follow." />
      </div>

      <div className="flex items-center gap-2 mt-3 text-xs">
        <span className="text-gray-400">Template</span>
        <Select value={page.template_id || '__none__'} onValueChange={v => updatePage(page.id, { template_id: v === '__none__' ? null : v }, { immediate: true })}>
          <SelectTrigger className="h-7 w-auto min-w-[10rem] text-xs">
            <SelectValue placeholder="Choose template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__"><span className="text-gray-400">No template</span></SelectItem>
            {sitemap.templates.map(t => <SelectItem key={t.id} value={t.id}>{templateLabel(t)}</SelectItem>)}
          </SelectContent>
        </Select>
        {template && (
          <button type="button" onClick={() => onJumpTemplate(template.id)} className="inline-flex items-center gap-1 text-coral hover:text-coral-dark" title="View template">
            <ExternalLink size={12} /> View
          </button>
        )}
      </div>

      {perfBlock}

      <Section label={showPerf ? 'Keyword cluster and rankings' : 'Keyword cluster'} hint={showPerf ? 'Rank tracker' : 'Volumes /mo'}>
        <KeywordTable
          sitemap={sitemap}
          version={version}
          page={page}
          onAdd={addKeyword}
          onUpdate={updateKeyword}
          onSetPrimary={setPrimaryKeyword}
          onDelete={deleteKeyword}
        />
      </Section>

      <Section label="Metadata">
        <div className="space-y-3">
          <FieldEditor label="Title tag" limit={60} value={page.title_tag} onChange={v => updatePage(page.id, { title_tag: v })} placeholder="Primary Keyword | Secondary | Brand" />
          <FieldEditor label="Meta description" limit={160} value={page.meta_description} onChange={v => updatePage(page.id, { meta_description: v })} placeholder="Two sentences at most. End with a full stop." rows={2} />
          <FieldEditor label="Recommended H1" value={page.h1} onChange={v => updatePage(page.id, { h1: v })} placeholder="Heading the page should lead with" />
        </div>
      </Section>

      <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end">
        <button
          type="button"
          onClick={() => onDeletePage(page)}
          className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md px-2 py-1 transition-colors"
        >
          <Trash2 size={13} /> Remove page
        </button>
      </div>
    </motion.aside>
  )
}
