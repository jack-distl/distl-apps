import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPortalContainer } from '@/lib/portal'
import { Stat, StatRow } from '@/components/Stat'
import { Tag } from '@/components/Tag'
import { Table, TableHeader, TableBody, TableHead, TableRow } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
const logoWhite = '/logos/distl-type-white.svg'
const logoPink = '/logos/distl-type-coral.svg'

// The client report. Every client-facing screen (the Blueprint, the SEO
// plan, the plans, Results) is built from these, so the whole Client view
// reads as one document, laid out for a wide screen and scrolled rather
// than paged. The parts are the platform's own: a dark panel for the
// cover with the client's name in Poppins Light and the period as the one
// pink line; white hairline panels on the sage canvas for each section;
// figures set as type on a StatRow, never boxed in tiles; sentence-case
// captions and the outlined Tag in place of small-caps labels; quiet
// sentence-case table headings; and the wordmark to close.

/** A small sentence-case caption over a group: "What it is", "The goal for this period". */
export const KICKER = 'text-xs font-medium text-ink-soft'

export function Kicker({ children, tone = 'soft', className }) {
  return <p className={cn(KICKER, tone === 'white' ? 'text-white/60' : tone === 'muted' ? 'text-ink-faint' : tone === 'pink' ? 'text-pink' : 'text-ink-soft', className)}>{children}</p>
}

/** The document: a stack of panels across the content width. */
export function Report({ children, className }) {
  return <div className={cn('w-full space-y-6', className)}>{children}</div>
}

/**
 * The cover: a dark panel with the wordmark, an outlined Tag saying what
 * this is, the client's name, the period (or a picker) as the one pink
 * line, and a line of context. `aside` sits on the right on wide screens
 * (a goal, a few figures).
 */
export function ReportCover({ kicker, title, period, picker, description, aside, children, className }) {
  return (
    <div className={cn('rounded-3xl bg-ink px-6 py-8 text-white sm:px-8 md:px-10 md:py-10', className)}>
      <div className="flex items-center justify-between gap-4">
        <img src={logoWhite} alt="Distl" className="h-4 w-auto" />
        {kicker && <Tag tone="white">{kicker}</Tag>}
      </div>
      <div className={cn('mt-10 grid grid-cols-1 gap-8 md:mt-12', aside && 'lg:grid-cols-12 lg:gap-12')}>
        <div className={cn('min-w-0', aside && 'lg:col-span-7')}>
          <h1 className="text-4xl font-light leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">{title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            {picker ? <CoverPicker {...picker} /> : period ? <p className="text-lg font-medium text-pink md:text-xl">{period}</p> : null}
            {children}
          </div>
          {description && <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/60">{description}</p>}
        </div>
        {aside && <div className="min-w-0 lg:col-span-5 lg:border-l lg:border-white/10 lg:pl-10">{aside}</div>}
      </div>
    </div>
  )
}

/** The period picker on a cover: the same pink line, but a menu. */
function CoverPicker({ value, options = [], onChange, label = 'Period' }) {
  if (options.length <= 1) return <p className="text-lg font-medium text-pink md:text-xl">{options[0]?.label || ''}</p>
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} title="Choose a period" className="h-auto w-auto gap-1.5 rounded-lg border-0 bg-transparent px-0 py-0 text-lg font-medium text-pink hover:text-pink-light focus:ring-0 md:text-xl [&>svg]:h-5 [&>svg]:w-5 [&>svg]:opacity-70 print:[&>svg]:hidden">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

/**
 * One section: a white panel with an outlined Tag, a light heading, an
 * optional line under it, then the content across the full width.
 * `tone` 'plain' drops the panel for content that brings its own (the
 * Blueprint's columns).
 */
export function ReportPage({ kicker, title, intro, aside, tone = 'white', children, className, id }) {
  return (
    <section id={id} className={cn('bp-avoid-break', tone === 'plain' ? '' : 'rounded-3xl border border-sage-line bg-white p-5 sm:p-6 md:p-8', className)}>
      {(kicker || title) && (
        <div className={cn('grid grid-cols-1 gap-4', aside && 'lg:grid-cols-12 lg:gap-10')}>
          <div className={cn(aside && 'lg:col-span-7')}>
            {kicker && <div className="mb-3"><Tag tone="soft" size="xs">{kicker}</Tag></div>}
            {title && <h2 className="text-2xl font-light tracking-tight text-ink md:text-3xl">{title}</h2>}
            {intro && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">{intro}</p>}
          </div>
          {aside && <div className="lg:col-span-5">{aside}</div>}
        </div>
      )}
      {children && <div className={cn((kicker || title) && 'mt-6')}>{children}</div>}
    </section>
  )
}

/** A smaller heading inside a section. */
export function ReportSubhead({ kicker, children, className }) {
  return (
    <div className={cn('mb-3', className)}>
      {kicker && <Kicker className="mb-1">{kicker}</Kicker>}
      {children && <h3 className="text-base font-medium text-ink">{children}</h3>}
    </div>
  )
}

const SUB_TONES = {
  good: 'text-emerald-600',
  bad: 'text-red-500',
  pink: 'text-pink',
  neutral: 'text-ink-faint',
}

/**
 * The headline figures, as type on one white panel: [{ label, value, sub,
 * tone, accent }]. The first is pink, the one the section is about.
 */
export function ReportStats({ items = [], lead = true, columns, size = 'md', className }) {
  const cols = columns || Math.min(5, Math.max(2, items.length))
  return (
    <StatRow columns={cols} className={className}>
      {items.map((it, i) => (
        <Stat
          key={it.key || it.label || i}
          label={it.label}
          value={it.value}
          size={size}
          accent={it.accent ?? (lead && i === 0)}
          sub={it.sub ? <span className={cn(SUB_TONES[it.tone] || SUB_TONES.neutral)}>{it.sub}</span> : null}
        />
      ))}
    </StatRow>
  )
}

export const TH = 'text-xs font-medium text-ink-soft first:pl-5 last:pr-5'
export const TD = 'px-3 py-2.5 align-top text-sm text-ink first:pl-5 last:pr-5'

/**
 * A table on a white panel with the platform's quiet sentence-case
 * headings. `head` is [{ label, align, className }]; the rows are plain
 * <tr>s built with the TD class.
 */
export function ReportTable({ head = [], children, className, caption }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-sage-line bg-white', className)}>
      <Table>
        {caption && <caption className="sr-only">{caption}</caption>}
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {head.map((h, i) => (
              <TableHead key={h.key || i} className={cn(TH, h.align === 'right' && 'text-right', h.align === 'center' && 'text-center', h.className)}>{h.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-sage-line">{children}</TableBody>
      </Table>
    </div>
  )
}

/** A quiet list: a sage dot per item and a hairline between them. */
export function ReportList({ kicker, items = [], empty = null, className, renderItem }) {
  return (
    <div className={cn('min-w-0', className)}>
      {kicker && <p className="mb-1 text-sm font-medium text-ink">{kicker}</p>}
      {items.length === 0 ? (
        empty && <p className="py-2 text-sm text-ink-faint">{empty}</p>
      ) : (
        <ul className="divide-y divide-sage-line">
          {items.map((it, i) => (
            <li key={it?.id || i} className="flex items-start gap-2.5 py-2.5 text-sm leading-relaxed text-ink">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-line" aria-hidden="true" />
              <div className="min-w-0 flex-1">{renderItem ? renderItem(it) : it}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** A note on the canvas colour with a bold lead-in. */
export function ReportNote({ lead, children, className }) {
  return (
    <div className={cn('rounded-xl border border-sage-line bg-sage px-4 py-3 text-sm leading-relaxed text-ink-soft', className)}>
      {lead && <strong className="font-medium text-ink">{lead} </strong>}
      {children}
    </div>
  )
}

/** The close: the wordmark and the line. */
export function ReportEnd({ className }) {
  return <ReportFooter className={className} />
}

export function ReportFooter({ className }) {
  return (
    <div className={cn('flex flex-col items-center gap-2 py-6 text-center', className)}>
      <img src={logoPink} alt="Distl" className="h-4 w-auto" />
      <p className="text-xs text-ink-faint">Brand Purity. Digital Potency.</p>
    </div>
  )
}

// ─── Visuals ─────────────────────────────────────────────────

export const isImageFile = a => a?.kind === 'file' && String(a.mime || '').startsWith('image/')

/**
 * A row of images with captions: screenshots of the ads, the posts, the
 * emails. Click one to see it large. `items` are attachment rows
 * ({ id, url, thumb_url, title, mime, kind }); anything that is not an
 * image is listed as a link underneath.
 */
export function ReportGallery({ items = [], columns = 3, className, emptyText = null }) {
  const [openId, setOpenId] = useState(null)
  const images = items.filter(isImageFile)
  const rest = items.filter(a => !isImageFile(a))
  const open = images.find(a => a.id === openId) || null
  const grid = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[columns] || 'sm:grid-cols-2 lg:grid-cols-3'
  if (!images.length && !rest.length) return emptyText ? <p className="text-sm text-ink-faint">{emptyText}</p> : null
  return (
    <div className={className}>
      {images.length > 0 && (
        <div className={cn('grid grid-cols-1 gap-4', grid)}>
          {images.map(a => (
            <figure key={a.id} className="min-w-0">
              <button type="button" onClick={() => setOpenId(a.id)} className="block w-full overflow-hidden rounded-2xl border border-sage-line bg-sage-light transition-colors hover:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pink/50" title="See it larger">
                <img src={a.thumb_url || a.url} alt={a.title || ''} className="aspect-[4/3] w-full object-cover object-top" loading="lazy" />
              </button>
              {a.title && <figcaption className="mt-2 text-sm text-ink-soft">{a.title}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      {rest.length > 0 && (
        <ul className={cn('flex flex-wrap gap-2', images.length && 'mt-4')}>
          {rest.map(a => (
            <li key={a.id}>
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-full border border-sage-line bg-white px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink">
                {a.title || a.url.replace(/^https?:\/\//, '')}
              </a>
            </li>
          ))}
        </ul>
      )}
      {open && <Lightbox item={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function Lightbox({ item, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  const box = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-4 animate-in fade-in-0 duration-150 print:hidden" onClick={onClose} role="dialog" aria-modal="true" aria-label={item.title || 'Image'}>
      <button type="button" onClick={onClose} className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20" title="Close (Esc)" aria-label="Close"><X size={18} /></button>
      <figure className="max-h-full max-w-6xl" onClick={e => e.stopPropagation()}>
        <img src={item.url} alt={item.title || ''} className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain" />
        {item.title && <figcaption className="mt-3 text-center text-sm text-white/70">{item.title}</figcaption>}
      </figure>
    </div>
  )
  return createPortal(box, getPortalContainer() || document.body)
}
