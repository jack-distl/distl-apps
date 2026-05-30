// The Unstoppable Blueprint — shared constants and helpers

// Status: green / amber / grey only (no red). Meanings per the brief.
export const STATUSES = ['green', 'amber', 'grey']

export const STATUS_META = {
  green: {
    label: 'In place',
    help: 'In place and competitive for the goal.',
    dot: 'bg-green-500',
    chip: 'bg-green-100 text-green-700',
    ring: 'border-green-500',
  },
  amber: {
    label: 'Underway',
    help: 'Happening, but not yet at the level the goal needs.',
    dot: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-700',
    ring: 'border-amber-500',
  },
  grey: {
    label: 'Not started',
    help: 'Not started yet. A sequenced future move.',
    dot: 'bg-gray-300',
    chip: 'bg-gray-100 text-gray-500',
    ring: 'border-gray-300',
  },
}

// Optional sequencing tag.
export const PHASES = ['now', 'next', 'later']
export const PHASE_META = {
  now: { label: 'Now' },
  next: { label: 'Next' },
  later: { label: 'Later' },
}

// Board stage (its mode).
export const STAGES = ['draft', 'proposal', 'live']
export const STAGE_LABELS = {
  draft: 'Draft',
  proposal: 'Proposal',
  live: 'Live',
}

// The three client-facing fields, in display order.
export const FIELD_LABELS = {
  why: 'Why we need it',
  recommend: "What we'd recommend",
  examples: 'Example inclusions',
}

// Derive a 2–5 char abbreviation for the shared `clients` table from a name.
export function deriveAbbreviation(name) {
  const cleaned = (name || '').trim()
  if (!cleaned) return 'NEW'
  const words = cleaned.split(/\s+/).filter(Boolean)
  let abbr
  if (words.length >= 2) {
    abbr = words.map(w => w[0]).join('')
  } else {
    abbr = words[0]
  }
  abbr = abbr.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (abbr.length < 2) abbr = cleaned.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (abbr.length < 2) abbr = (abbr + 'XX')
  return abbr.slice(0, 5)
}
