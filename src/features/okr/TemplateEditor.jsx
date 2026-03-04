import { useState, useMemo } from 'react'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Search, X, Minus,
  Globe, FileText, Hash,
} from 'lucide-react'
import { useTemplates } from '../../contexts/TemplateContext'
import { ConfirmDialog } from '../../components'
import { Input } from '../../components/ui/input'
import { SCOPE_OPTIONS } from '../../lib/taskLibrary'
import { formatHours, roundToHalf, generateId } from '../../lib/constants'

const SCOPE_ICONS = {
  'sitewide': Globe,
  'specific-pages': FileText,
  'keyword-group': Hash,
}

export default function TemplateEditor() {
  const {
    tasks, templates, allTemplatesResolved,
    addTask, updateTask, deleteTask,
    addTemplate, updateTemplate, deleteTemplate,
    addTaskToTemplate, removeTaskFromTemplate,
  } = useTemplates()

  const [activeTab, setActiveTab] = useState('templates')
  const [expandedTemplateId, setExpandedTemplateId] = useState(null)
  const [search, setSearch] = useState('')

  // New template form
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newTplTitle, setNewTplTitle] = useState('')
  const [newTplScope, setNewTplScope] = useState('sitewide')

  // New task form
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskAmHours, setNewTaskAmHours] = useState(0.5)
  const [newTaskSeoHours, setNewTaskSeoHours] = useState(2)

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null) // { type, id, name, templateCount? }

  // Search filtering
  const filteredTemplates = useMemo(() => {
    if (!search) return allTemplatesResolved
    const q = search.toLowerCase()
    return allTemplatesResolved.filter(t => t.title.toLowerCase().includes(q))
  }, [allTemplatesResolved, search])

  const filteredTasks = useMemo(() => {
    if (!search) return tasks
    const q = search.toLowerCase()
    return tasks.filter(t => t.name.toLowerCase().includes(q))
  }, [tasks, search])

  // Count how many templates use a given task
  function taskUsageCount(taskId) {
    return templates.filter(t => t.tasks.includes(taskId)).length
  }

  // ─── Handlers ──────────────────────────────────────────────

  function handleAddTemplate(e) {
    e.preventDefault()
    if (!newTplTitle.trim()) return
    const tpl = addTemplate({
      title: newTplTitle.trim(),
      defaultScope: newTplScope,
      tasks: [],
    })
    setNewTplTitle('')
    setNewTplScope('sitewide')
    setShowNewTemplate(false)
    setExpandedTemplateId(tpl.id)
  }

  function handleAddTask(e) {
    e.preventDefault()
    if (!newTaskName.trim()) return
    addTask({
      name: newTaskName.trim(),
      defaultAmHours: roundToHalf(newTaskAmHours),
      defaultSeoHours: roundToHalf(newTaskSeoHours),
    })
    setNewTaskName('')
    setNewTaskAmHours(0.5)
    setNewTaskSeoHours(2)
    setShowNewTask(false)
  }

  function handleDeleteConfirm() {
    if (!confirmDelete) return
    if (confirmDelete.type === 'template') {
      deleteTemplate(confirmDelete.id)
      if (expandedTemplateId === confirmDelete.id) setExpandedTemplateId(null)
    } else if (confirmDelete.type === 'task') {
      deleteTask(confirmDelete.id)
    }
    setConfirmDelete(null)
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div>
      {/* Tab toggle + search */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-charcoal text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Objective Templates
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'bg-charcoal text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Task Library
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <Input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'templates' ? 'Search templates...' : 'Search tasks...'}
            className="pl-9 pr-8"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Templates Tab ──────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="space-y-3">
          {/* New template button / form */}
          {showNewTemplate ? (
            <form onSubmit={handleAddTemplate} className="bg-white rounded-xl border border-gray-200 border-dashed p-5">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-500 mb-1">Template Title</label>
                  <input
                    type="text"
                    value={newTplTitle}
                    onChange={e => setNewTplTitle(e.target.value)}
                    placeholder="e.g. E-commerce SEO Setup"
                    autoFocus
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
                  />
                </div>
                <div className="w-40">
                  <label className="block text-sm text-gray-500 mb-1">Default Scope</label>
                  <select
                    value={newTplScope}
                    onChange={e => setNewTplScope(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  >
                    {SCOPE_OPTIONS.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={!newTplTitle.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-coral text-white hover:bg-coral-dark disabled:opacity-40 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewTemplate(false); setNewTplTitle('') }}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowNewTemplate(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-coral hover:text-coral-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          )}

          {/* Template list */}
          {filteredTemplates.map(tpl => {
            const isExpanded = expandedTemplateId === tpl.id
            const ScopeIcon = SCOPE_ICONS[tpl.defaultScope] || Globe
            const scopeOption = SCOPE_OPTIONS.find(s => s.id === tpl.defaultScope)
            // Tasks available to add (not already in this template)
            const availableTasks = tasks.filter(t => !tpl.tasks.includes(t.id))

            return (
              <div key={tpl.id} className="bg-white rounded-xl border border-gray-100 shadow-sm">
                {/* Header row */}
                <div
                  className="flex items-center gap-3 p-5 cursor-pointer"
                  onClick={() => setExpandedTemplateId(isExpanded ? null : tpl.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-charcoal truncate">{tpl.title}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${scopeOption?.color || 'bg-gray-100 text-gray-700'}`}>
                        <ScopeIcon size={11} />
                        {scopeOption?.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {tpl.taskCount} {tpl.taskCount === 1 ? 'task' : 'tasks'} &middot; {formatHours(tpl.totalHours)} total
                    </p>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setConfirmDelete({ type: 'template', id: tpl.id, name: tpl.title })
                    }}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={15} />
                  </button>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
                    {/* Editable title & scope */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1">Title</label>
                        <input
                          type="text"
                          value={tpl.title}
                          onChange={e => updateTemplate(tpl.id, { title: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
                        />
                      </div>
                      <div className="w-40">
                        <label className="block text-xs text-gray-400 mb-1">Default Scope</label>
                        <select
                          value={tpl.defaultScope}
                          onChange={e => updateTemplate(tpl.id, { defaultScope: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                        >
                          {SCOPE_OPTIONS.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Task list within template */}
                    {tpl.resolvedTasks.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Tasks</p>
                        {tpl.resolvedTasks.map(task => (
                          <div key={task.id} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-gray-50 group">
                            <span className="flex-1 text-sm text-charcoal truncate">{task.name}</span>
                            <span className="text-xs text-gray-400 tabular-nums">
                              AM {formatHours(task.defaultAmHours)}
                            </span>
                            <span className="text-xs text-gray-400 tabular-nums">
                              SEO {formatHours(task.defaultSeoHours)}
                            </span>
                            <button
                              onClick={() => removeTaskFromTemplate(tpl.id, task.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-0.5"
                              title="Remove from template"
                            >
                              <Minus size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No tasks yet. Add some below.</p>
                    )}

                    {/* Add task to template */}
                    {availableTasks.length > 0 && (
                      <div>
                        <select
                          value=""
                          onChange={e => {
                            if (e.target.value) addTaskToTemplate(tpl.id, e.target.value)
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 focus:outline-none focus:ring-2 focus:ring-coral/30"
                        >
                          <option value="">+ Add a task to this template...</option>
                          {availableTasks.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({formatHours(t.defaultAmHours + t.defaultSeoHours)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {filteredTemplates.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              {search ? `No templates match "${search}"` : 'No templates yet'}
            </p>
          )}
        </div>
      )}

      {/* ─── Tasks Tab ──────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div>
          {/* New task button / form */}
          {showNewTask ? (
            <form onSubmit={handleAddTask} className="bg-white rounded-xl border border-gray-200 border-dashed p-5 mb-3">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-500 mb-1">Task Name</label>
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={e => setNewTaskName(e.target.value)}
                    placeholder="e.g. Schema Audit"
                    autoFocus
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm text-gray-500 mb-1">AM Hrs</label>
                  <input
                    type="number"
                    value={newTaskAmHours}
                    onChange={e => setNewTaskAmHours(Number(e.target.value) || 0)}
                    min={0}
                    step={0.5}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm text-gray-500 mb-1">SEO Hrs</label>
                  <input
                    type="number"
                    value={newTaskSeoHours}
                    onChange={e => setNewTaskSeoHours(Number(e.target.value) || 0)}
                    min={0}
                    step={0.5}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newTaskName.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-coral text-white hover:bg-coral-dark disabled:opacity-40 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewTask(false); setNewTaskName('') }}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowNewTask(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-coral hover:text-coral-dark transition-colors mb-3"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}

          {/* Column headers */}
          <div className="flex items-center gap-3 px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
            <span className="flex-1">Task Name</span>
            <span className="w-20 text-center">AM Hrs</span>
            <span className="w-20 text-center">SEO Hrs</span>
            <span className="w-16 text-center">Total</span>
            <span className="w-20 text-center">Used In</span>
            <span className="w-8" />
          </div>

          {/* Task rows */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {filteredTasks.map(task => {
              const usage = taskUsageCount(task.id)
              return (
                <div key={task.id} className="flex items-center gap-3 px-5 py-3 group">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={task.name}
                      onChange={e => updateTask(task.id, { name: e.target.value })}
                      className="w-full bg-transparent text-sm text-charcoal border-0 p-0 focus:outline-none focus:ring-0 placeholder-gray-300"
                      placeholder="Task name"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={task.defaultAmHours}
                      onChange={e => updateTask(task.id, { defaultAmHours: roundToHalf(Number(e.target.value) || 0) })}
                      min={0}
                      step={0.5}
                      className="w-full px-1.5 py-0.5 text-xs border border-gray-200 rounded text-center focus:outline-none focus:ring-2 focus:ring-coral/30"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={task.defaultSeoHours}
                      onChange={e => updateTask(task.id, { defaultSeoHours: roundToHalf(Number(e.target.value) || 0) })}
                      min={0}
                      step={0.5}
                      className="w-full px-1.5 py-0.5 text-xs border border-gray-200 rounded text-center focus:outline-none focus:ring-2 focus:ring-coral/30"
                    />
                  </div>
                  <div className="w-16 text-center">
                    <span className="text-xs text-gray-500 tabular-nums">
                      {formatHours(task.defaultAmHours + task.defaultSeoHours)}
                    </span>
                  </div>
                  <div className="w-20 text-center">
                    <span className={`text-xs ${usage > 0 ? 'text-coral font-medium' : 'text-gray-300'}`}>
                      {usage} {usage === 1 ? 'template' : 'templates'}
                    </span>
                  </div>
                  <div className="w-8">
                    <button
                      onClick={() => setConfirmDelete({
                        type: 'task',
                        id: task.id,
                        name: task.name,
                        templateCount: usage,
                      })}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
                      title="Delete task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredTasks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              {search ? `No tasks match "${search}"` : 'No tasks yet'}
            </p>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${confirmDelete?.type === 'template' ? 'Template' : 'Task'}`}
        message={
          confirmDelete?.type === 'task' && confirmDelete?.templateCount > 0
            ? `"${confirmDelete?.name}" is used in ${confirmDelete.templateCount} template${confirmDelete.templateCount === 1 ? '' : 's'}. Deleting it will remove it from those templates too. Continue?`
            : `Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`
        }
      />
    </div>
  )
}
