export const HOURLY_RATE = 180
export const AD_HOC_BUFFER = 0.1 // 10%
export const DEFAULT_OFFSITE_ALLOWANCE = 5 // 5%
export const AM_HOUR_TARGET = 0.4 // 40%
export const SEO_HOUR_TARGET = 0.6 // 60%

export const ROLES = {
  ADMIN: 'admin',
  AM: 'am',
  SEO: 'seo',
}

export const ROLE_LABELS = {
  admin: 'Admin',
  am: 'Account Manager',
  seo: 'SEO Specialist',
}

// Round to nearest 0.5
export function roundToHalf(n) {
  return Math.round(n * 2) / 2
}

// Format hours for display — shows "Xh" or "X.5h"
export function formatHours(n) {
  if (n === 0) return '0h'
  const rounded = roundToHalf(n)
  return `${rounded}h`
}

// Format currency
export function formatCurrency(n) {
  return `$${n.toLocaleString()}`
}

// Calculate months between two month/year pairs (inclusive)
export function calculatePeriodMonths(startMonth, startYear, endMonth, endYear) {
  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1
}

// Generate a period label from dates (e.g. "Jan - Mar 2026")
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function getPeriodLabel(startMonth, startYear, endMonth, endYear) {
  const start = MONTH_NAMES[startMonth - 1]
  const end = MONTH_NAMES[endMonth - 1]
  if (startYear === endYear) {
    return `${start} – ${end} ${endYear}`
  }
  return `${start} ${startYear} – ${end} ${endYear}`
}

// Generate unique IDs
let idCounter = Date.now()
export function generateId(prefix = 'id') {
  return `${prefix}-${++idCounter}`
}
