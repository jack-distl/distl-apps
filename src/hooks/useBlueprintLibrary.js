import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// The backend library: the five domains (columns), the master list of library
// elements, and the industry templates. All editable in-app by the team.
export function useBlueprintLibrary() {
  const [domains, setDomains] = useState([])
  const [elements, setElements] = useState([])
  const [templates, setTemplates] = useState([])
  const [templateElements, setTemplateElements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [d, e, t, te] = await Promise.all([
        supabase.from('bp_domains').select('*').order('sort_order'),
        supabase.from('bp_library_elements').select('*').order('sort_order'),
        supabase.from('bp_industry_templates').select('*').order('name'),
        supabase.from('bp_template_elements').select('*').order('sort_order'),
      ])
      if (d.error) throw d.error
      if (e.error) throw e.error
      if (t.error) throw t.error
      if (te.error) throw te.error
      setDomains(d.data || [])
      setElements(e.data || [])
      setTemplates(t.data || [])
      setTemplateElements(te.data || [])
    } catch (err) {
      console.error('useBlueprintLibrary fetch error:', err)
      setError('Failed to load the library.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Library elements ──────────────────────────────────────────
  async function createElement(fields) {
    const domainElements = elements.filter(el => el.domain_id === fields.domain_id)
    const sort_order = domainElements.length
      ? Math.max(...domainElements.map(el => el.sort_order)) + 1
      : 0
    const { error: err } = await supabase
      .from('bp_library_elements')
      .insert({ ...fields, sort_order })
    if (err) throw new Error('Failed to create element.')
    await fetchAll()
  }

  async function updateElement(id, fields) {
    const { error: err } = await supabase
      .from('bp_library_elements')
      .update(fields)
      .eq('id', id)
    if (err) throw new Error('Failed to update element.')
    await fetchAll()
  }

  // Retire / restore (we keep history rather than hard-deleting the master list).
  async function setElementActive(id, isActive) {
    await updateElement(id, { is_active: isActive })
  }

  // ── Domains (names / outcome lines editable; slug stays stable) ─
  async function updateDomain(id, fields) {
    const { error: err } = await supabase
      .from('bp_domains')
      .update(fields)
      .eq('id', id)
    if (err) throw new Error('Failed to update column.')
    await fetchAll()
  }

  // ── Industry templates ────────────────────────────────────────
  async function createTemplate({ name, description }) {
    const slug = (name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `template-${Date.now()}`
    const { data, error: err } = await supabase
      .from('bp_industry_templates')
      .insert({ slug, name, description })
      .select()
      .single()
    if (err) throw new Error('Failed to create template.')
    await fetchAll()
    return data
  }

  async function updateTemplate(id, fields) {
    const { error: err } = await supabase
      .from('bp_industry_templates')
      .update(fields)
      .eq('id', id)
    if (err) throw new Error('Failed to update template.')
    await fetchAll()
  }

  // Replace a template's element selection. `selected` is an ordered array of
  // library_element_ids; order becomes sort_order.
  async function setTemplateSelection(templateId, selected) {
    const { error: delErr } = await supabase
      .from('bp_template_elements')
      .delete()
      .eq('template_id', templateId)
    if (delErr) throw new Error('Failed to update template.')
    if (selected.length) {
      const rows = selected.map((library_element_id, i) => ({
        template_id: templateId,
        library_element_id,
        sort_order: i,
      }))
      const { error: insErr } = await supabase
        .from('bp_template_elements')
        .insert(rows)
      if (insErr) throw new Error('Failed to update template.')
    }
    await fetchAll()
  }

  return {
    domains, elements, templates, templateElements,
    loading, error, refetch: fetchAll,
    createElement, updateElement, setElementActive, updateDomain,
    createTemplate, updateTemplate, setTemplateSelection,
  }
}
