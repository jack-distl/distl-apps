// Supabase caps a select at 1,000 rows. Anything that can grow past that
// pages through with fetchAllRows, or the screen quietly shows part of the
// data. Shared with the WordPress build, whose REST route has the same cap.

import { supabase } from './supabase.js'

export const PAGE = 1000

/**
 * Every row of a select. `filter` adds conditions to the query builder
 * (q => q.eq('sitemap_id', id)); rows come back in the order it sets.
 */
export async function fetchAllRows(table, columns, filter = null) {
  const out = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select(columns)
    if (filter) q = filter(q)
    const { data, error } = await q.range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < PAGE) return out
  }
}

/** fetchAllRows for `column IN (ids)`, in chunks so the query string stays short. */
export async function fetchAllIn(table, columns, column, ids, filter = null, chunk = 200) {
  const list = [...new Set((ids || []).filter(Boolean))]
  const out = []
  for (let i = 0; i < list.length; i += chunk) {
    const part = list.slice(i, i + chunk)
    out.push(...await fetchAllRows(table, columns, q => {
      const next = q.in(column, part)
      return filter ? filter(next) : next
    }))
  }
  return out
}
