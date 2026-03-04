import { createContext, useContext, useState, useMemo, useCallback } from 'react'
import {
  TASK_LIBRARY as DEFAULT_TASKS,
  OBJECTIVE_TEMPLATES as DEFAULT_TEMPLATES,
} from '../lib/taskLibrary'
import { generateId } from '../lib/constants'

const TemplateContext = createContext(null)

export function TemplateProvider({ children }) {
  const [tasks, setTasks] = useState(DEFAULT_TASKS)
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)

  // ─── Task CRUD ─────────────────────────────────────────────
  const addTask = useCallback((task) => {
    const newTask = { id: generateId(), ...task }
    setTasks(prev => [...prev, newTask])
    return newTask
  }, [])

  const updateTask = useCallback((taskId, updates) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
  }, [])

  const deleteTask = useCallback((taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    // Cascade: remove from any templates that reference this task
    setTemplates(prev => prev.map(tpl => ({
      ...tpl,
      tasks: tpl.tasks.filter(id => id !== taskId),
    })))
  }, [])

  // ─── Template CRUD ─────────────────────────────────────────
  const addTemplate = useCallback((template) => {
    const newTemplate = { id: generateId(), ...template }
    setTemplates(prev => [...prev, newTemplate])
    return newTemplate
  }, [])

  const updateTemplate = useCallback((templateId, updates) => {
    setTemplates(prev => prev.map(t =>
      t.id === templateId ? { ...t, ...updates } : t
    ))
  }, [])

  const deleteTemplate = useCallback((templateId) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId))
  }, [])

  // ─── Template task operations ──────────────────────────────
  const addTaskToTemplate = useCallback((templateId, taskId) => {
    setTemplates(prev => prev.map(t =>
      t.id === templateId && !t.tasks.includes(taskId)
        ? { ...t, tasks: [...t.tasks, taskId] }
        : t
    ))
  }, [])

  const removeTaskFromTemplate = useCallback((templateId, taskId) => {
    setTemplates(prev => prev.map(t =>
      t.id === templateId
        ? { ...t, tasks: t.tasks.filter(id => id !== taskId) }
        : t
    ))
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
