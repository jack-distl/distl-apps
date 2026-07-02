import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  TASK_LIBRARY as DEFAULT_TASKS,
  OBJECTIVE_TEMPLATES as DEFAULT_TEMPLATES,
} from '../lib/taskLibrary'
import { generateId } from '../lib/constants'

const TemplateContext = createContext(null)

// ─── DB ↔ Frontend conversion ────────────────────────────────
function taskFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    defaultAmHours: Number(row.default_am_hours),
    defaultSeoHours: Number(row.default_seo_hours),
  }
}

function templatesFromDb(tplRows, junctionRows) {
  return tplRows.map(r => ({
    id: r.id,
    title: r.title,
    defaultScope: r.default_scope,
    tasks: (junctionRows || [])
      .filter(j => j.template_id === r.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(j => j.task_id),
  }))
}

export function TemplateProvider({ children }) {
  // Seed from constants so the dev/no-Supabase path and first paint work.
  const [tasks, setTasks] = useState(DEFAULT_TASKS)
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)
  const [loading, setLoading] = useState(!!supabase)

  // ─── Load from Supabase ──────────────────────────────────────
  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const [taskRes, tplRes, juncRes] = await Promise.all([
          supabase.from('task_library').select('*').eq('is_active', true).order('sort_order'),
          supabase.from('objective_templates').select('*').eq('is_active', true).order('sort_order'),
          supabase.from('objective_template_tasks').select('*').order('sort_order'),
        ])
        if (cancelled) return
        if (taskRes.error) throw taskRes.error
        if (tplRes.error) throw tplRes.error
        if (juncRes.error) throw juncRes.error
        // Only replace the seeded defaults when the DB actually has data
        // (an unseeded DB keeps the constants as a fallback).
        if (taskRes.data?.length) setTasks(taskRes.data.map(taskFromDb))
        if (tplRes.data?.length) setTemplates(templatesFromDb(tplRes.data, juncRes.data))
      } catch (err) {
        console.error('Template load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ─── Task CRUD ─────────────────────────────────────────────
  const addTask = useCallback(async (task) => {
    const shaped = {
      name: task.name,
      defaultAmHours: task.defaultAmHours ?? 0,
      defaultSeoHours: task.defaultSeoHours ?? 0,
    }
    if (!supabase) {
      const newTask = { id: generateId(), ...shaped }
      setTasks(prev => [...prev, newTask])
      return newTask
    }
    const { data, error } = await supabase
      .from('task_library')
      .insert({
        name: shaped.name,
        default_am_hours: shaped.defaultAmHours,
        default_seo_hours: shaped.defaultSeoHours,
        sort_order: tasks.length,
      })
      .select()
      .single()
    if (error) throw error
    const newTask = taskFromDb(data)
    setTasks(prev => [...prev, newTask])
    return newTask
  }, [tasks.length])

  const updateTask = useCallback(async (taskId, updates) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
    if (!supabase) return
    const payload = {}
    if ('name' in updates) payload.name = updates.name
    if ('defaultAmHours' in updates) payload.default_am_hours = updates.defaultAmHours
    if ('defaultSeoHours' in updates) payload.default_seo_hours = updates.defaultSeoHours
    const { error } = await supabase.from('task_library').update(payload).eq('id', taskId)
    if (error) console.error('updateTask error:', error)
  }, [])

  const deleteTask = useCallback(async (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    // Cascade in local state; DB junction rows cascade via FK.
    setTemplates(prev => prev.map(tpl => ({
      ...tpl,
      tasks: tpl.tasks.filter(id => id !== taskId),
    })))
    if (!supabase) return
    const { error } = await supabase.from('task_library').delete().eq('id', taskId)
    if (error) console.error('deleteTask error:', error)
  }, [])

  // ─── Template CRUD ─────────────────────────────────────────
  const addTemplate = useCallback(async (template) => {
    const shaped = {
      title: template.title,
      defaultScope: template.defaultScope || 'sitewide',
      tasks: template.tasks || [],
    }
    if (!supabase) {
      const newTemplate = { id: generateId(), ...shaped }
      setTemplates(prev => [...prev, newTemplate])
      return newTemplate
    }
    const { data, error } = await supabase
      .from('objective_templates')
      .insert({
        title: shaped.title,
        default_scope: shaped.defaultScope,
        sort_order: templates.length,
      })
      .select()
      .single()
    if (error) throw error
    const newTemplate = { id: data.id, title: data.title, defaultScope: data.default_scope, tasks: [] }
    setTemplates(prev => [...prev, newTemplate])
    return newTemplate
  }, [templates.length])

  const updateTemplate = useCallback(async (templateId, updates) => {
    setTemplates(prev => prev.map(t =>
      t.id === templateId ? { ...t, ...updates } : t
    ))
    if (!supabase) return
    const payload = {}
    if ('title' in updates) payload.title = updates.title
    if ('defaultScope' in updates) payload.default_scope = updates.defaultScope
    if (Object.keys(payload).length === 0) return
    const { error } = await supabase.from('objective_templates').update(payload).eq('id', templateId)
    if (error) console.error('updateTemplate error:', error)
  }, [])

  const deleteTemplate = useCallback(async (templateId) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId))
    if (!supabase) return
    const { error } = await supabase.from('objective_templates').delete().eq('id', templateId)
    if (error) console.error('deleteTemplate error:', error)
  }, [])

  // ─── Template task operations ──────────────────────────────
  const addTaskToTemplate = useCallback(async (templateId, taskId) => {
    let nextOrder = 0
    setTemplates(prev => prev.map(t => {
      if (t.id !== templateId || t.tasks.includes(taskId)) return t
      nextOrder = t.tasks.length
      return { ...t, tasks: [...t.tasks, taskId] }
    }))
    if (!supabase) return
    const { error } = await supabase
      .from('objective_template_tasks')
      .insert({ template_id: templateId, task_id: taskId, sort_order: nextOrder })
    if (error) console.error('addTaskToTemplate error:', error)
  }, [])

  const removeTaskFromTemplate = useCallback(async (templateId, taskId) => {
    setTemplates(prev => prev.map(t =>
      t.id === templateId
        ? { ...t, tasks: t.tasks.filter(id => id !== taskId) }
        : t
    ))
    if (!supabase) return
    const { error } = await supabase
      .from('objective_template_tasks')
      .delete()
      .eq('template_id', templateId)
      .eq('task_id', taskId)
    if (error) console.error('removeTaskFromTemplate error:', error)
  }, [])

  // ─── Resolve helpers (live state versions) ─────────────────
  const resolveTemplate = useCallback((templateId) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return null
    const resolvedTasks = template.tasks
      .map(taskId => tasks.find(t => t.id === taskId))
      .filter(Boolean)
    const totalHours = resolvedTasks.reduce(
      (sum, t) => sum + t.defaultAmHours + t.defaultSeoHours, 0
    )
    return { ...template, resolvedTasks, totalHours, taskCount: resolvedTasks.length }
  }, [templates, tasks])

  const allTemplatesResolved = useMemo(() => {
    return templates.map(t => resolveTemplate(t.id)).filter(Boolean)
  }, [templates, resolveTemplate])

  const value = {
    tasks,
    templates,
    allTemplatesResolved,
    loading,
    addTask,
    updateTask,
    deleteTask,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addTaskToTemplate,
    removeTaskFromTemplate,
    resolveTemplate,
  }

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  )
}

export function useTemplates() {
  const ctx = useContext(TemplateContext)
  if (!ctx) throw new Error('useTemplates must be used within TemplateProvider')
  return ctx
}
