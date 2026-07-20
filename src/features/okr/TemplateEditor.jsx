import { useState, useMemo } from 'react'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Search, X, Minus,
  Globe, FileText, Hash,
} from 'lucide-react'
import { useTemplates } from '../../contexts/TemplateContext'
import { ConfirmDialog } from '../../components'
import { Input } from '../../components/ui/input'
import { SCOPE_OPTIONS, TEMPLATE_CATEGORIES } from '../../lib/taskLibrary'
import { formatHours, roundToHalf } from '../../lib/constants'

const UNCATEGORISED = 'Uncategorised'

const SCOPE_ICONS = {
  'sitewide': Globe,
  'specific-pages': FileText,
  'keyword-group': Hash,
}

const BLANK_NEW_TASK = { name: '', am: 0.5, seo: 2 }

export default function TemplateEditor() {
  const {
    tasks, templates, allTemplatesResolved, categories,
    addTask, updateTask,
    addTemplate, updateTemplate, deleteTemplate,
    addTaskToTemplate, removeTaskFromTemplate,
  } = useTemplates()

  const [expandedTemplateId, setExpandedTemplateId] = useState(null)
  const [search, setSearch] = useState('')

  // Category options for the selects: canonical list merged with any already
  // present in the DB, so custom categories still appear.
  const categoryOptions = useMemo(() => {
    const merged = [...TEMPLATE_CATEGORIES, ...categories]
    return [...new Set(merged)]
  }, [categories])

  // New template form
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newTplTitle, setNewTplTitle] = useState('')
  const [newTplCategory, setNewTplCategory] = useState(TEMPLATE_CATEGORIES[0] || '')
  const [newTplScope, setNewTplScope] = useState('sitewide')

  // Inline "create new task" form, scoped to the template it belongs to
  const [newTaskFor, setNewTaskFor] = useState(null) // templateId | null
  const [newTask, setNewTask] = useState(BLANK_NEW_TASK)

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null) // { id, name }

  // Search filtering
  const filteredTemplates = useMemo(() => {
    if (!search) return allTemplatesResolved
    const q = search.toLowerCase()
    return allTemplatesResolved.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q) ||
      t.resolvedTasks.some(task => task.name.toLowerCase().includes(q))
    )
  }, [allTemplatesResolved, search])

  // Group filtered templates by category (canonical order, extras, then uncategorised)
  const groupedTemplates = useMemo(() => {
    const byCat = new Map()
    for (const tpl of filteredTemplates) {
      const key = tpl.category || UNCATEGORISED
      if (!byCat.has(key)) byCat.set(key, [])
      byCat.get(key).push(tpl)
    }
    const order = [...categoryOptions, UNCATEGORISED]
    return order
      .filter(cat => byCat.has(cat))
      .map(cat => [cat, byCat.get(cat)])
  }, [filteredTemplates, categoryOptions])

  // ─── Handlers ──────────────────────────────────────────────

  async function handleAddTemplate(e) {
    e.preventDefault()
    if (!newTplTitle.trim()) return
    const tpl = await addTemplate({
      title: newTplTitle.trim(),
      category: newTplCategory || null,
      defaultScope: newTplScope,
      tasks: [],
    })
    setNewTplTitle('')
    setNewTplCategory(TEMPLATE_CATEGORIES[0] || '')
    setNewTplScope('sitewide')
    setShowNewTemplate(false)
    if (tpl) setExpandedTemplateId(tpl.id)
  }

  function openNewTask(templateId) {
    setNewTaskFor(templateId)
    setNewTask(BLANK_NEW_TASK)
  }

  async function handleCreateTaskInTemplate(e, templateId) {
    e.preventDefault()
    if (!newTask.name.trim()) return
    const created = await addTask({
      name: newTask.name.trim(),
      defaultAmHours: roundToHalf(newTask.am),
      defaultSeoHours: roundToHalf(newTask.seo),
    })
    if (created) await addTaskToTemplate(templateId, created.id)
    setNewTaskFor(null)
    setNewTask(BLANK_NEW_TASK)
  }

  function handleDeleteConfirm() {
    if (!confirmDelete) return
    deleteTemplate(confirmDelete.id)
    if (expandedTemplateId === confirmDelete.id) setExpandedTemplateId(null)
    setConfirmDelete(null)
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div>
      {/* Heading + search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">OKR Task Templates</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Reusable objective templates and their tasks. Edits apply everywhere a task is used.
          </p>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <Input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates or tasks..."
            className="pl-9 pr-8"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

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
              <div className="w-44">
                <label className="block text-sm text-gray-500 mb-1">Category</label>
                <select
                  value={newTplCategory}
                  onChange={e => setNewTplCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                >
                  {categoryOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
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

        {/* Template list, grouped by category */}
        {groupedTemplates.map(([category, tpls]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2 pt-3 pb-0.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{category}</h3>
              <span className="text-xs text-gray-300">· {tpls.length}</span>
            </div>
            {tpls.map(tpl => {
          const isExpanded = expandedTemplateId === tpl.id
          const ScopeIcon = SCOPE_ICONS[tpl.defaultScope] || Globe
          const scopeOption = SCOPE_OPTIONS.find(s => s.id === tpl.defaultScope)
          // Tasks available to add (not already in this template)
          const availableTasks = tasks.filter(t => !tpl.tasks.includes(t.id))
          const isAddingTask = newTaskFor === tpl.id

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
                    setConfirmDelete({ id: tpl.id, name: tpl.title })
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
                    <div className="w-44">
                      <label className="block text-xs text-gray-400 mb-1">Category</label>
                      <select
                        value={tpl.category || ''}
                        onChange={e => updateTemplate(tpl.id, { category: e.target.value || null })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                      >
                        <option value="">Uncategorised</option>
                        {categoryOptions.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
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

                  {/* Task list within template — inline editable */}
                  {tpl.resolvedTasks.length > 0 ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 px-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        <span className="flex-1">Task</span>
                        <span className="w-16 text-center">AM</span>
                        <span className="w-16 text-center">SEO</span>
                        <span className="w-6" />
                      </div>
                      {tpl.resolvedTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-gray-50 group">
                          <input
                            type="text"
                            value={task.name}
                            onChange={e => updateTask(task.id, { name: e.target.value })}
                            className="flex-1 min-w-0 bg-transparent text-sm text-charcoal border-0 p-0 focus:outline-none focus:ring-0"
                          />
                          <input
                            type="number"
                            value={task.defaultAmHours}
                            onChange={e => updateTask(task.id, { defaultAmHours: roundToHalf(Number(e.target.value) || 0) })}
                            min={0}
                            step={0.5}
                            className="w-16 px-1.5 py-0.5 text-xs border border-gray-200 rounded text-center focus:outline-none focus:ring-2 focus:ring-coral/30"
                          />
                          <input
                            type="number"
                            value={task.defaultSeoHours}
                            onChange={e => updateTask(task.id, { defaultSeoHours: roundToHalf(Number(e.target.value) || 0) })}
                            min={0}
                            step={0.5}
                            className="w-16 px-1.5 py-0.5 text-xs border border-gray-200 rounded text-center focus:outline-none focus:ring-2 focus:ring-coral/30"
                          />
                          <button
                            onClick={() => removeTaskFromTemplate(tpl.id, task.id)}
                            className="w-6 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-0.5"
                            title="Remove from template"
                          >
                            <Minus size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No tasks yet. Add one below.</p>
                  )}

                  {/* Add existing task + create new task */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {availableTasks.length > 0 && (
                      <select
                        value=""
                        onChange={e => {
                          if (e.target.value) addTaskToTemplate(tpl.id, e.target.value)
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 focus:outline-none focus:ring-2 focus:ring-coral/30"
                      >
                        <option value="">+ Add an existing task...</option>
                        {availableTasks.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({formatHours(t.defaultAmHours + t.defaultSeoHours)})
                          </option>
                        ))}
                      </select>
                    )}
                    {!isAddingTask && (
                      <button
                        onClick={() => openNewTask(tpl.id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-coral hover:text-coral-dark border border-coral/30 rounded-lg hover:bg-coral/5 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        New Task
                      </button>
                    )}
                  </div>

                  {/* Inline create-new-task form */}
                  {isAddingTask && (
                    <form
                      onSubmit={e => handleCreateTaskInTemplate(e, tpl.id)}
                      className="bg-gray-50 rounded-lg border border-gray-200 border-dashed p-3"
                    >
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[160px]">
                          <label className="block text-xs text-gray-500 mb-1">New Task Name</label>
                          <input
                            type="text"
                            value={newTask.name}
                            onChange={e => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Schema Audit"
                            autoFocus
                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
                          />
                        </div>
                        <div className="w-20">
                          <label className="block text-xs text-gray-500 mb-1">AM Hrs</label>
                          <input
                            type="number"
                            value={newTask.am}
                            onChange={e => setNewTask(prev => ({ ...prev, am: Number(e.target.value) || 0 }))}
                            min={0}
                            step={0.5}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                          />
                        </div>
                        <div className="w-20">
                          <label className="block text-xs text-gray-500 mb-1">SEO Hrs</label>
                          <input
                            type="number"
                            value={newTask.seo}
                            onChange={e => setNewTask(prev => ({ ...prev, seo: Number(e.target.value) || 0 }))}
                            min={0}
                            step={0.5}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!newTask.name.trim()}
                          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-coral text-white hover:bg-coral-dark disabled:opacity-40 transition-colors"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => { setNewTaskFor(null); setNewTask(BLANK_NEW_TASK) }}
                          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-2">
                        Creates a reusable task in the master library and adds it to this template.
                      </p>
                    </form>
                  )}
                </div>
              )}
            </div>
          )
            })}
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            {search ? `No templates or tasks match "${search}"` : 'No templates yet'}
          </p>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Template"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
      />
    </div>
  )
}
