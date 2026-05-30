import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { deriveAbbreviation } from '../lib/blueprintConstants'

// ── List of all client blueprints (for the home screen) ──────────
export function useBlueprintsList() {
  const [blueprints, setBlueprints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchList = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('bp_blueprints')
      .select('*, client:clients(id, name)')
      .order('created_at', { ascending: false })
    if (err) {
      console.error('useBlueprintsList error:', err)
      setError('Failed to load blueprints.')
    } else {
      setBlueprints(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchList() }, [fetchList])

  // Create a new client + blueprint, optionally pre-loading an industry template.
  async function createBlueprint({ name, goal, templateId }) {
    const abbreviation = deriveAbbreviation(name)
    const { data: client, error: cErr } = await supabase
      .from('clients')
      .insert({ name, abbreviation, is_active: true })
      .select()
      .single()
    if (cErr) throw new Error('Failed to create client.')

    const { data: bp, error: bErr } = await supabase
      .from('bp_blueprints')
      .insert({
        client_id: client.id,
        goal_statement: goal || null,
        industry_template_id: templateId || null,
        stage: 'proposal',
      })
      .select()
      .single()
    if (bErr) throw new Error('Failed to create blueprint.')

    if (templateId) {
      const { data: tes, error: tErr } = await supabase
        .from('bp_template_elements')
        .select('sort_order, suggested_status, suggested_phase, library_element:bp_library_elements(*)')
        .eq('template_id', templateId)
        .order('sort_order')
      if (tErr) throw new Error('Failed to apply template.')
      const rows = (tes || [])
        .filter(te => te.library_element)
        .map((te, i) => ({
          blueprint_id: bp.id,
          domain_id: te.library_element.domain_id,
          library_element_id: te.library_element.id,
          title: te.library_element.title,
          recommend: te.library_element.default_recommend,
          why: te.library_element.default_why,
          examples: te.library_element.default_examples,
          status: te.suggested_status || 'grey',
          phase: te.suggested_phase || te.library_element.default_phase || null,
          sort_order: te.sort_order ?? i,
        }))
      if (rows.length) {
        const { error: ceErr } = await supabase.from('bp_client_elements').insert(rows)
        if (ceErr) throw new Error('Failed to apply template.')
      }
    }

    await fetchList()
    return { client, blueprint: bp }
  }

  async function deleteBlueprint(clientId) {
    // Removing the client cascades to the blueprint and its elements.
    const { error: err } = await supabase.from('clients').delete().eq('id', clientId)
    if (err) throw new Error('Failed to delete blueprint.')
    await fetchList()
  }

  return { blueprints, loading, error, refetch: fetchList, createBlueprint, deleteBlueprint }
}

// ── A single client's board (the internal editor) ────────────────
export function useBlueprint(clientId) {
  const [blueprint, setBlueprint] = useState(null)
  const [elements, setElements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBoard = useCallback(async () => {
    if (!supabase || !clientId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const { data: bp, error: bErr } = await supabase
        .from('bp_blueprints')
        .select('*, client:clients(id, name)')
        .eq('client_id', clientId)
        .maybeSingle()
      if (bErr) throw bErr
      setBlueprint(bp)

      if (bp) {
        const { data: els, error: eErr } = await supabase
          .from('bp_client_elements')
          .select('*')
          .eq('blueprint_id', bp.id)
          .order('sort_order')
        if (eErr) throw eErr
        setElements(els || [])
      } else {
        setElements([])
      }
    } catch (err) {
      console.error('useBlueprint fetch error:', err)
      setError('Failed to load the board.')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  // ── Blueprint-level edits ─────────────────────────────────────
  async function updateBlueprint(fields) {
    setBlueprint(prev => prev ? { ...prev, ...fields } : prev) // optimistic
    const { error: err } = await supabase
      .from('bp_blueprints')
      .update(fields)
      .eq('id', blueprint.id)
    if (err) { await fetchBoard(); throw new Error('Failed to save.') }
  }

  // ── Element edits ─────────────────────────────────────────────
  async function addLibraryElement(libElement) {
    const inDomain = elements.filter(e => e.domain_id === libElement.domain_id)
    const sort_order = inDomain.length ? Math.max(...inDomain.map(e => e.sort_order)) + 1 : 0
    const { error: err } = await supabase.from('bp_client_elements').insert({
      blueprint_id: blueprint.id,
      domain_id: libElement.domain_id,
      library_element_id: libElement.id,
      title: libElement.title,
      recommend: libElement.default_recommend,
      why: libElement.default_why,
      examples: libElement.default_examples,
      status: 'grey',
      phase: libElement.default_phase || null,
      sort_order,
    })
    if (err) throw new Error('Failed to add element.')
    await fetchBoard()
  }

  async function addBespokeElement(domainId, title) {
    const inDomain = elements.filter(e => e.domain_id === domainId)
    const sort_order = inDomain.length ? Math.max(...inDomain.map(e => e.sort_order)) + 1 : 0
    const { error: err } = await supabase.from('bp_client_elements').insert({
      blueprint_id: blueprint.id,
      domain_id: domainId,
      library_element_id: null,
      title,
      status: 'grey',
      sort_order,
    })
    if (err) throw new Error('Failed to add element.')
    await fetchBoard()
  }

  async function updateElement(id, fields) {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...fields } : e)) // optimistic
    const { error: err } = await supabase
      .from('bp_client_elements')
      .update(fields)
      .eq('id', id)
    if (err) { await fetchBoard(); throw new Error('Failed to save.') }
  }

  async function removeElement(id) {
    setElements(prev => prev.filter(e => e.id !== id)) // optimistic
    const { error: err } = await supabase.from('bp_client_elements').delete().eq('id', id)
    if (err) { await fetchBoard(); throw new Error('Failed to remove element.') }
  }

  // Move an element up/down within its column.
  async function moveElement(id, direction) {
    const el = elements.find(e => e.id === id)
    if (!el) return
    const siblings = elements
      .filter(e => e.domain_id === el.domain_id)
      .sort((a, b) => a.sort_order - b.sort_order)
    const idx = siblings.findIndex(e => e.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) return
    const other = siblings[swapIdx]
    // Swap sort_order values.
    setElements(prev => prev.map(e => {
      if (e.id === el.id) return { ...e, sort_order: other.sort_order }
      if (e.id === other.id) return { ...e, sort_order: el.sort_order }
      return e
    }))
    await Promise.all([
      supabase.from('bp_client_elements').update({ sort_order: other.sort_order }).eq('id', el.id),
      supabase.from('bp_client_elements').update({ sort_order: el.sort_order }).eq('id', other.id),
    ])
    await fetchBoard()
  }

  // ── Checkpoints ───────────────────────────────────────────────
  async function createCheckpoint(label) {
    const { data: existing, error: exErr } = await supabase
      .from('bp_checkpoints')
      .select('version')
      .eq('blueprint_id', blueprint.id)
      .order('version', { ascending: false })
      .limit(1)
    if (exErr) throw new Error('Failed to save checkpoint.')
    const nextVersion = existing && existing.length ? existing[0].version + 1 : 1
    const snapshot = { blueprint, elements, captured_at: new Date().toISOString() }
    const { data, error: err } = await supabase
      .from('bp_checkpoints')
      .insert({ blueprint_id: blueprint.id, version: nextVersion, label: label || null, snapshot })
      .select()
      .single()
    if (err) throw new Error('Failed to save checkpoint.')
    return data
  }

  async function fetchCheckpoints() {
    const { data, error: err } = await supabase
      .from('bp_checkpoints')
      .select('id, version, label, created_at')
      .eq('blueprint_id', blueprint.id)
      .order('version', { ascending: false })
    if (err) return []
    return data || []
  }

  return {
    blueprint, elements, loading, error, refetch: fetchBoard,
    updateBlueprint, addLibraryElement, addBespokeElement,
    updateElement, removeElement, moveElement,
    createCheckpoint, fetchCheckpoints,
  }
}

// ── Public board (read-only, by share token, no login) ───────────
export function usePublicBoard(token) {
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase || !token) { setLoading(false); return }
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase.rpc('bp_get_public_board', { p_token: token })
      if (cancelled) return
      if (err) {
        console.error('usePublicBoard error:', err)
        setError('Could not load this board.')
      } else {
        setBoard(data) // null if not shared / not found
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [token])

  return { board, loading, error }
}
