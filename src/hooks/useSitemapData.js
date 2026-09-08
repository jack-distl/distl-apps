import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { generateId } from '../lib/constants'
import { buildSampleSitemap } from '../lib/sitemap/sampleData.js'
import { DEFAULT_MENUS, DEFAULT_PAGE_TEMPLATES, DEFAULT_PLAN_VERSION_NAME } from '../lib/sitemap/defaults.js'
import { normaliseUrl, cascadeUrlChange } from '../lib/sitemap/tree.js'

// ─── Load ───────────────────────────────────────────────────────

async function loadSitemap(clientId) {
  const { data: sm, error: smErr } = await supabase
    .from('sitemaps').select('*').eq('client_id', clientId).maybeSingle()
  if (smErr) throw smErr
  if (!sm) return null

  const [tplRes, pageRes, verRes] = await Promise.all([
    supabase.from('sitemap_page_templates').select('*').eq('sitemap_id', sm.id).order('sort_order'),
    supabase.from('sitemap_pages').select('*').eq('sitemap_id', sm.id).order('sort_order'),
    supabase.from('sitemap_versions').select('*').eq('sitemap_id', sm.id).order('sort_order'),
  ])
  for (const r of [tplRes, pageRes, verRes]) if (r.error) throw r.error

  const pages = pageRes.data || []
  const versions = verRes.data || []
  const pageIds = pages.map(p => p.id)
  const versionIds = versions.map(v => v.id)

  const [kwRes, upRes, pmRes, kpRes, qRes] = await Promise.all([
    pageIds.length ? supabase.from('sitemap_keywords').select('*').in('page_id', pageIds).order('sort_order') : { data: [] },
    versionIds.length ? supabase.from('sitemap_version_uploads').select('*').in('version_id', versionIds).order('uploaded_at') : { data: [] },
    versionIds.length ? supabase.from('sitemap_version_page_metrics').select('*').in('version_id', versionIds) : { data: [] },
    versionIds.length ? supabase.from('sitemap_version_keyword_positions').select('*').in('version_id', versionIds) : { data: [] },
    versionIds.length ? supabase.from('sitemap_version_queries').select('*').in('version_id', versionIds).order('sort_order') : { data: [] },
  ])
  for (const r of [kwRes, upRes, pmRes, kpRes, qRes]) if (r.error) throw r.error

  const kwByPage = {}
  for (const k of kwRes.data || []) (kwByPage[k.page_id] ||= []).push(k)

  return {
    ...sm,
    templates: tplRes.data || [],
    pages: pages.map(p => ({ ...p, keywords: kwByPage[p.id] || [] })),
    versions: versions.map(v => ({
      ...v,
      uploads: (upRes.data || []).filter(u => u.version_id === v.id),
      pageMetrics: Object.fromEntries((pmRes.data || []).filter(m => m.version_id === v.id).map(m => [m.page_id, m])),
      keywordPositions: Object.fromEntries((kpRes.data || []).filter(k => k.version_id === v.id).map(k => [k.keyword_id, k])),
      queries: (qRes.data || []).filter(q => q.version_id === v.id),
    })),
  }
}

// ─── Hook ───────────────────────────────────────────────────────

/**
 * Loads and mutates one client's sitemap. Every mutation updates local state
 * immediately; database writes are queued and debounced per record (text
 * edits) or issued straight away (structural changes). Save status mirrors
 * the OKR planner: idle | unsaved | saving | saved | error.
 */
export function useSitemapData(clientId) {
  const [sitemap, setSitemap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [saveError, setSaveError] = useState(null)

  const pending = useRef(new Map())     // key → { table, id, fields }
  const flushTimer = useRef(null)
  const inflight = useRef(0)
  const savedTimer = useRef(null)

  const fetchData = useCallback(async () => {
    if (!clientId) return
    if (!supabase) {
      setSitemap(buildSampleSitemap(clientId))
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setSitemap(await loadSitemap(clientId))
    } catch (err) {
      console.error('useSitemapData load error:', err)
      setError('Failed to load the sitemap.')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Write plumbing ───────────────────────────────────────
  const markSaved = useCallback(() => {
    setSaveStatus('saved')
    setSaveError(null)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaveStatus(s => (s === 'saved' ? 'idle' : s)), 2000)
  }, [])

  const runWrite = useCallback(async (fn) => {
    if (!supabase) return
    inflight.current++
    setSaveStatus('saving')
    try {
      const { error: err } = await fn()
      if (err) throw err
      if (inflight.current === 1 && pending.current.size === 0) markSaved()
    } catch (err) {
      console.error('Sitemap save error:', err)
      setSaveError(err?.message || 'Failed to save. Your changes may not be persisted.')
      setSaveStatus('error')
    } finally {
      inflight.current--
    }
  }, [markSaved])

  const flushPending = useCallback(async () => {
    if (!supabase) { pending.current.clear(); return }
    const batch = [...pending.current.values()]
    pending.current.clear()
    for (const w of batch) {
      await runWrite(() => supabase.from(w.table).update(w.fields).eq('id', w.id))
    }
  }, [runWrite])

  /** Debounced field update (text edits). */
  const queueUpdate = useCallback((table, id, fields) => {
    if (!supabase) return
    const key = `${table}:${id}`
    const cur = pending.current.get(key)
    pending.current.set(key, { table, id, fields: { ...(cur?.fields || {}), ...fields } })
    setSaveStatus('unsaved')
    if (flushTimer.current) clearTimeout(flushTimer.current)
    flushTimer.current = setTimeout(flushPending, 1200)
  }, [flushPending])

  // Flush on unmount so a last edit is not lost
  useEffect(() => () => {
    if (flushTimer.current) clearTimeout(flushTimer.current)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    if (pending.current.size) flushPending()
  }, [flushPending])

  useEffect(() => {
    if (saveStatus !== 'unsaved' && saveStatus !== 'saving') return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [saveStatus])

  const retrySave = useCallback(() => {
    setSaveError(null)
    flushPending()
  }, [flushPending])

  // ─── Helpers ──────────────────────────────────────────────
  const patch = useCallback((fn) => setSitemap(prev => (prev ? fn(prev) : prev)), [])

  // ─── Sitemap: create / settings ───────────────────────────
  const createSitemap = useCallback(async () => {
    const id = generateId()
    const now = new Date().toISOString()
    const templates = DEFAULT_PAGE_TEMPLATES.map((t, i) => ({ id: generateId(), sitemap_id: id, ...t, sort_order: i }))
    const plan = { id: generateId(), sitemap_id: id, name: DEFAULT_PLAN_VERSION_NAME, type: 'plan', sort_order: 0, created_at: now, uploads: [], pageMetrics: {}, keywordPositions: {}, queries: [] }
    const sm = { id, client_id: clientId, domain: null, review_cadence: 'quarterly', menus: [...DEFAULT_MENUS], templates, pages: [], versions: [plan] }
    setSitemap(sm)
    if (!supabase) return sm
    await runWrite(() => supabase.from('sitemaps').insert({ id, client_id: clientId, review_cadence: 'quarterly', menus: sm.menus }))
    await runWrite(() => supabase.from('sitemap_page_templates').insert(templates.map(({ id: tid, sitemap_id, code, name, description, blocks, sort_order }) => ({ id: tid, sitemap_id, code, name, description, blocks, sort_order }))))
    await runWrite(() => supabase.from('sitemap_versions').insert({ id: plan.id, sitemap_id: id, name: plan.name, type: 'plan', sort_order: 0 }))
    return sm
  }, [clientId, runWrite])

  const updateSitemap = useCallback((fields) => {
    patch(sm => ({ ...sm, ...fields }))
    if (sitemap) runWrite(() => supabase.from('sitemaps').update(fields).eq('id', sitemap.id))
  }, [patch, runWrite, sitemap])

  // ─── Pages ────────────────────────────────────────────────
  const addPage = useCallback((fields) => {
    const page = {
      id: generateId(), sitemap_id: sitemap.id,
      name: fields.name || 'New page', url: normaliseUrl(fields.url), status: fields.status || 'add',
      template_id: fields.template_id || null, title_tag: fields.title_tag || '', meta_description: fields.meta_description || '',
      h1: fields.h1 || '', post_type: fields.post_type || 'page', menu_names: fields.menu_names || null,
      sort_order: fields.sort_order ?? (sitemap.pages.length ? Math.max(...sitemap.pages.map(p => p.sort_order)) + 1 : 0),
      keywords: [],
    }
    const kws = (fields.keywords || []).map((k, i) => ({ id: generateId(), page_id: page.id, keyword: k.keyword, volume: Number(k.volume) || 0, is_primary: !!k.is_primary, sort_order: i }))
    page.keywords = kws
    patch(sm => ({ ...sm, pages: [...sm.pages, page] }))
    const { keywords, ...row } = page
    runWrite(() => supabase.from('sitemap_pages').insert(row)).then(() => {
      if (kws.length) runWrite(() => supabase.from('sitemap_keywords').insert(kws))
    })
    return page
  }, [patch, runWrite, sitemap])

  const updatePage = useCallback((pageId, fields, { immediate = false } = {}) => {
    patch(sm => ({ ...sm, pages: sm.pages.map(p => (p.id === pageId ? { ...p, ...fields } : p)) }))
    if (immediate) runWrite(() => supabase.from('sitemap_pages').update(fields).eq('id', pageId))
    else queueUpdate('sitemap_pages', pageId, fields)
  }, [patch, runWrite, queueUpdate])

  /** Change a page URL and optionally cascade to descendants. Returns the cascade list. */
  const updatePageUrl = useCallback((pageId, newUrl, { cascade = false } = {}) => {
    const page = sitemap?.pages.find(p => p.id === pageId)
    if (!page) return []
    const url = normaliseUrl(newUrl)
    const children = cascade ? cascadeUrlChange(sitemap.pages, page.url, url) : []
    const updates = new Map([[pageId, url], ...children.map(c => [c.page.id, c.newUrl])])
    patch(sm => ({ ...sm, pages: sm.pages.map(p => (updates.has(p.id) ? { ...p, url: updates.get(p.id) } : p)) }))
    for (const [id, u] of updates) runWrite(() => supabase.from('sitemap_pages').update({ url: u }).eq('id', id))
    return children
  }, [patch, runWrite, sitemap])

  const deletePage = useCallback((pageId) => {
    let removed = null
    patch(sm => {
      removed = sm.pages.find(p => p.id === pageId) || null
      return { ...sm, pages: sm.pages.filter(p => p.id !== pageId) }
    })
    runWrite(() => supabase.from('sitemap_pages').delete().eq('id', pageId))
    return removed
  }, [patch, runWrite])

  /** Re-insert a page removed with deletePage (undo). Performance rows are gone. */
  const restorePage = useCallback((page) => {
    if (!page) return
    patch(sm => ({ ...sm, pages: [...sm.pages, page].sort((a, b) => a.sort_order - b.sort_order) }))
    const { keywords, ...row } = page
    runWrite(() => supabase.from('sitemap_pages').insert(row)).then(() => {
      if (keywords?.length) runWrite(() => supabase.from('sitemap_keywords').insert(keywords))
    })
  }, [patch, runWrite])

  /** Assign sort_order to ids in order. `slots` (optional) supplies the sort values to use, e.g. the siblings' existing slots. */
  const reorderPages = useCallback((orderedIds, slots = null) => {
    const order = new Map(orderedIds.map((id, i) => [id, slots ? slots[i] : i]))
    patch(sm => ({ ...sm, pages: sm.pages.map(p => (order.has(p.id) ? { ...p, sort_order: order.get(p.id) } : p)) }))
    for (const [id, i] of order) queueUpdate('sitemap_pages', id, { sort_order: i })
  }, [patch, queueUpdate])

  // ─── Keywords ─────────────────────────────────────────────
  const addKeyword = useCallback((pageId, { keyword, volume = 0, is_primary = false }) => {
    const page = sitemap?.pages.find(p => p.id === pageId)
    if (!page) return null
    const makePrimary = is_primary || !page.keywords.some(k => k.is_primary)
    const kw = { id: generateId(), page_id: pageId, keyword: String(keyword).trim().toLowerCase(), volume: Number(volume) || 0, is_primary: makePrimary, sort_order: page.keywords.length }
    patch(sm => ({ ...sm, pages: sm.pages.map(p => (p.id === pageId ? { ...p, keywords: [...p.keywords, kw] } : p)) }))
    runWrite(() => supabase.from('sitemap_keywords').insert(kw))
    return kw
  }, [patch, runWrite, sitemap])

  const updateKeyword = useCallback((keywordId, fields) => {
    patch(sm => ({ ...sm, pages: sm.pages.map(p => ({ ...p, keywords: p.keywords.map(k => (k.id === keywordId ? { ...k, ...fields } : k)) })) }))
    queueUpdate('sitemap_keywords', keywordId, fields)
  }, [patch, queueUpdate])

  const setPrimaryKeyword = useCallback(async (pageId, keywordId) => {
    const page = sitemap?.pages.find(p => p.id === pageId)
    if (!page) return
    const prev = page.keywords.find(k => k.is_primary)
    patch(sm => ({ ...sm, pages: sm.pages.map(p => (p.id === pageId ? { ...p, keywords: p.keywords.map(k => ({ ...k, is_primary: k.id === keywordId })) } : p)) }))
    if (!supabase) return
    // Unique index: clear the old primary before setting the new one
    if (prev && prev.id !== keywordId) await runWrite(() => supabase.from('sitemap_keywords').update({ is_primary: false }).eq('id', prev.id))
    await runWrite(() => supabase.from('sitemap_keywords').update({ is_primary: true }).eq('id', keywordId))
  }, [patch, runWrite, sitemap])

  const deleteKeyword = useCallback((keywordId) => {
    patch(sm => ({
      ...sm,
      pages: sm.pages.map(p => {
        if (!p.keywords.some(k => k.id === keywordId)) return p
        const remaining = p.keywords.filter(k => k.id !== keywordId)
        // Keep exactly one primary if any keywords remain
        if (remaining.length && !remaining.some(k => k.is_primary)) {
          const top = remaining.reduce((b, k) => (b == null || k.volume > b.volume ? k : b), null)
          if (top && supabase) runWrite(() => supabase.from('sitemap_keywords').update({ is_primary: true }).eq('id', top.id))
          return { ...p, keywords: remaining.map(k => ({ ...k, is_primary: k.id === top.id })) }
        }
        return { ...p, keywords: remaining }
      }),
    }))
    runWrite(() => supabase.from('sitemap_keywords').delete().eq('id', keywordId))
  }, [patch, runWrite])

  /** Remove many keywords at once (bulk edit). Keeps one primary per affected page. */
  const deleteKeywords = useCallback((keywordIds) => {
    const ids = new Set(keywordIds)
    if (!ids.size) return
    const promote = []
    patch(sm => ({
      ...sm,
      pages: sm.pages.map(p => {
        if (!p.keywords.some(k => ids.has(k.id))) return p
        const remaining = p.keywords.filter(k => !ids.has(k.id))
        if (remaining.length && !remaining.some(k => k.is_primary)) {
          const top = remaining.reduce((b, k) => (b == null || k.volume > b.volume ? k : b), null)
          promote.push(top.id)
          return { ...p, keywords: remaining.map(k => ({ ...k, is_primary: k.id === top.id })) }
        }
        return { ...p, keywords: remaining }
      }),
    }))
    if (!supabase) return
    runWrite(() => supabase.from('sitemap_keywords').delete().in('id', [...ids])).then(() => {
      for (const id of promote) runWrite(() => supabase.from('sitemap_keywords').update({ is_primary: true }).eq('id', id))
    })
  }, [patch, runWrite])

  // ─── Templates ────────────────────────────────────────────
  const addTemplate = useCallback((fields = {}) => {
    const n = sitemap.templates.length
    const tpl = { id: generateId(), sitemap_id: sitemap.id, code: fields.code || `T${n + 1}`, name: fields.name || 'New template', description: fields.description || '', blocks: fields.blocks || [[{ t: 'Page header', c: 'hero' }], [{ t: 'Content', c: 'tall' }]], sort_order: n }
    patch(sm => ({ ...sm, templates: [...sm.templates, tpl] }))
    runWrite(() => supabase.from('sitemap_page_templates').insert(tpl))
    return tpl
  }, [patch, runWrite, sitemap])

  const updateTemplate = useCallback((templateId, fields, { immediate = false } = {}) => {
    patch(sm => ({ ...sm, templates: sm.templates.map(t => (t.id === templateId ? { ...t, ...fields } : t)) }))
    if (immediate) runWrite(() => supabase.from('sitemap_page_templates').update(fields).eq('id', templateId))
    else queueUpdate('sitemap_page_templates', templateId, fields)
  }, [patch, runWrite, queueUpdate])

  const deleteTemplate = useCallback((templateId) => {
    patch(sm => ({
      ...sm,
      templates: sm.templates.filter(t => t.id !== templateId),
      pages: sm.pages.map(p => (p.template_id === templateId ? { ...p, template_id: null } : p)),
    }))
    runWrite(() => supabase.from('sitemap_page_templates').delete().eq('id', templateId))
  }, [patch, runWrite])

  // ─── Menus ────────────────────────────────────────────────
  const setMenus = useCallback((menus) => updateSitemap({ menus }), [updateSitemap])

  // ─── Versions ─────────────────────────────────────────────
  /**
   * Create a version. For reviews pass `snapshot` from buildReviewSnapshot
   * and `uploads` metadata; rows are bulk-inserted.
   */
  const addVersion = useCallback(async ({ name, type = 'review', snapshot = null, uploads = [], period_start = null, period_end = null }) => {
    const id = generateId()
    const now = new Date().toISOString()
    const sortOrder = sitemap.versions.length ? Math.max(...sitemap.versions.map(v => v.sort_order)) + 1 : 0
    const pageMetrics = Object.fromEntries(Object.values(snapshot?.pageMetrics || {}).map(m => [m.page_id, { id: generateId(), version_id: id, ...m }]))
    const keywordPositions = Object.fromEntries(Object.values(snapshot?.keywordPositions || {}).map(k => [k.keyword_id, { id: generateId(), version_id: id, ...k }]))
    const queries = (snapshot?.queries || []).map(q => ({ id: generateId(), version_id: id, ...q }))
    const uploadRows = uploads.map(u => ({ id: generateId(), version_id: id, uploaded_at: now, ...u }))
    const version = { id, sitemap_id: sitemap.id, name, type, sort_order: sortOrder, created_at: now, period_start, period_end, uploads: uploadRows, pageMetrics, keywordPositions, queries }
    patch(sm => ({ ...sm, versions: [...sm.versions, version] }))
    if (!supabase) return version
    await runWrite(() => supabase.from('sitemap_versions').insert({ id, sitemap_id: sitemap.id, name, type, sort_order: sortOrder, period_start, period_end }))
    const pm = Object.values(pageMetrics)
    const kp = Object.values(keywordPositions)
    if (uploadRows.length) await runWrite(() => supabase.from('sitemap_version_uploads').insert(uploadRows))
    if (pm.length) await runWrite(() => supabase.from('sitemap_version_page_metrics').insert(pm))
    if (kp.length) await runWrite(() => supabase.from('sitemap_version_keyword_positions').insert(kp))
    for (let i = 0; i < queries.length; i += 500) {
      await runWrite(() => supabase.from('sitemap_version_queries').insert(queries.slice(i, i + 500)))
    }
    return version
  }, [patch, runWrite, sitemap])

  const updateVersion = useCallback((versionId, fields) => {
    patch(sm => ({ ...sm, versions: sm.versions.map(v => (v.id === versionId ? { ...v, ...fields } : v)) }))
    queueUpdate('sitemap_versions', versionId, fields)
  }, [patch, queueUpdate])

  const deleteVersion = useCallback((versionId) => {
    patch(sm => ({ ...sm, versions: sm.versions.filter(v => v.id !== versionId) }))
    runWrite(() => supabase.from('sitemap_versions').delete().eq('id', versionId))
  }, [patch, runWrite])

  /** Replace a review version's performance rows and upload records with a fresh snapshot. */
  const replaceVersionData = useCallback(async (versionId, { snapshot, uploads = [] }) => {
    const now = new Date().toISOString()
    const pageMetrics = Object.fromEntries(Object.values(snapshot?.pageMetrics || {}).map(m => [m.page_id, { id: generateId(), version_id: versionId, ...m }]))
    const keywordPositions = Object.fromEntries(Object.values(snapshot?.keywordPositions || {}).map(k => [k.keyword_id, { id: generateId(), version_id: versionId, ...k }]))
    const queries = (snapshot?.queries || []).map(q => ({ id: generateId(), version_id: versionId, ...q }))
    const uploadRows = uploads.map(u => ({ id: generateId(), version_id: versionId, uploaded_at: now, ...u }))
    patch(sm => ({ ...sm, versions: sm.versions.map(v => (v.id === versionId ? { ...v, type: 'review', uploads: uploadRows, pageMetrics, keywordPositions, queries } : v)) }))
    if (!supabase) return
    for (const table of ['sitemap_version_uploads', 'sitemap_version_page_metrics', 'sitemap_version_keyword_positions', 'sitemap_version_queries']) {
      await runWrite(() => supabase.from(table).delete().eq('version_id', versionId))
    }
    await runWrite(() => supabase.from('sitemap_versions').update({ type: 'review' }).eq('id', versionId))
    const pm = Object.values(pageMetrics)
    const kp = Object.values(keywordPositions)
    if (uploadRows.length) await runWrite(() => supabase.from('sitemap_version_uploads').insert(uploadRows))
    if (pm.length) await runWrite(() => supabase.from('sitemap_version_page_metrics').insert(pm))
    if (kp.length) await runWrite(() => supabase.from('sitemap_version_keyword_positions').insert(kp))
    for (let i = 0; i < queries.length; i += 500) {
      await runWrite(() => supabase.from('sitemap_version_queries').insert(queries.slice(i, i + 500)))
    }
  }, [patch, runWrite])

  const deleteUpload = useCallback((versionId, uploadId) => {
    patch(sm => ({ ...sm, versions: sm.versions.map(v => (v.id === versionId ? { ...v, uploads: v.uploads.filter(u => u.id !== uploadId) } : v)) }))
    runWrite(() => supabase.from('sitemap_version_uploads').delete().eq('id', uploadId))
  }, [patch, runWrite])

  // ─── Bulk apply (landing and volume refresh) ──────────────
  const applyOperations = useCallback(async ({ pageInserts = [], pageUpdates = [], keywordInserts = [], keywordUpdates = [] }) => {
    const base = sitemap.pages.length ? Math.max(...sitemap.pages.map(p => p.sort_order)) + 1 : 0
    const newPages = pageInserts.map((p, i) => {
      const id = generateId()
      return {
        id, sitemap_id: sitemap.id, name: p.name, url: normaliseUrl(p.url), status: p.status || 'keep',
        template_id: p.templateId || p.template_id || null, title_tag: p.title_tag || '', meta_description: p.meta_description || '', h1: p.h1 || '',
        post_type: p.post_type || 'page', menu_names: p.menu_names || null, sort_order: base + i,
        keywords: (p.keywords || []).map((k, ki) => ({ id: generateId(), page_id: id, keyword: k.keyword, volume: Number(k.volume) || 0, is_primary: !!k.is_primary, sort_order: ki })),
      }
    })
    const kwInserts = keywordInserts.map(k => {
      const page = sitemap.pages.find(p => p.id === k.pageId)
      return { id: generateId(), page_id: k.pageId, keyword: k.keyword, volume: Number(k.volume) || 0, is_primary: !!k.is_primary, sort_order: (page?.keywords.length || 0) }
    })
    const pageUpd = new Map(pageUpdates.map(u => [u.pageId, u.fields]))
    const kwUpd = new Map(keywordUpdates.map(u => [u.keywordId, u.fields]))

    const nextPages = [
      ...sitemap.pages.map(p => {
        let np = pageUpd.has(p.id) ? { ...p, ...pageUpd.get(p.id) } : p
        const added = kwInserts.filter(k => k.page_id === p.id)
        if (added.length || np.keywords.some(k => kwUpd.has(k.id))) {
          np = { ...np, keywords: [...np.keywords.map(k => (kwUpd.has(k.id) ? { ...k, ...kwUpd.get(k.id) } : k)), ...added] }
        }
        return np
      }),
      ...newPages,
    ]
    patch(sm => ({ ...sm, pages: nextPages }))
    const result = { pages: nextPages, newPages }

    if (!supabase) return result
    if (newPages.length) {
      await runWrite(() => supabase.from('sitemap_pages').insert(newPages.map(({ keywords, ...row }) => row)))
      const kws = newPages.flatMap(p => p.keywords)
      if (kws.length) await runWrite(() => supabase.from('sitemap_keywords').insert(kws))
    }
    if (kwInserts.length) await runWrite(() => supabase.from('sitemap_keywords').insert(kwInserts))
    for (const [id, fields] of pageUpd) await runWrite(() => supabase.from('sitemap_pages').update(fields).eq('id', id))
    for (const [id, fields] of kwUpd) await runWrite(() => supabase.from('sitemap_keywords').update(fields).eq('id', id))
    return result
  }, [patch, runWrite, sitemap])

  return {
    sitemap, loading, error, saveStatus, saveError, retrySave, refetch: fetchData,
    createSitemap, updateSitemap, setMenus,
    addPage, updatePage, updatePageUrl, deletePage, restorePage, reorderPages,
    addKeyword, updateKeyword, setPrimaryKeyword, deleteKeyword, deleteKeywords,
    addTemplate, updateTemplate, deleteTemplate,
    addVersion, updateVersion, deleteVersion, deleteUpload, replaceVersionData,
    applyOperations,
  }
}

/** Lightweight summary for the Sitemap Tool home: page and version counts per client. */
export async function fetchSitemapSummaries() {
  if (!supabase) return null
  const { data: sms, error } = await supabase.from('sitemaps').select('id, client_id, review_cadence, updated_at')
  if (error) { console.error('fetchSitemapSummaries error:', error); return null }
  if (!sms?.length) return {}
  const ids = sms.map(s => s.id)
  const [pages, versions] = await Promise.all([
    supabase.from('sitemap_pages').select('sitemap_id').in('sitemap_id', ids),
    supabase.from('sitemap_versions').select('sitemap_id, name, type, sort_order').in('sitemap_id', ids).order('sort_order'),
  ])
  const out = {}
  for (const s of sms) {
    const vs = (versions.data || []).filter(v => v.sitemap_id === s.id)
    out[s.client_id] = {
      pageCount: (pages.data || []).filter(p => p.sitemap_id === s.id).length,
      versionCount: vs.length,
      latestVersion: vs.length ? vs[vs.length - 1].name : null,
      reviewCadence: s.review_cadence,
      updatedAt: s.updated_at,
    }
  }
  return out
}
