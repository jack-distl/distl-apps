import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, Copy, ChevronDown, ChevronUp,
  Trash2, Globe, FileText, Hash, CheckCircle, XCircle,
  AlertTriangle, Search, X, Loader2, Check, Circle, Pencil,
  BookmarkPlus, Upload, Link2, Flag, Undo2, MoreHorizontal, StickyNote,
} from 'lucide-react'
import { UndoToast } from '../../components/UndoToast'
import { ClientEditModal } from '../../components/ClientEditModal'
import { MondayPushModal } from './components/MondayPushModal'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Badge } from '../../components/ui/badge'
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '../../components/ui/select'
import ClientView from './ClientView'
import FutureTasks, { FutureTaskPicker, UNCATEGORISED } from './FutureTasks'
import { PageLinkPicker } from './components/PageLinkPicker'
import { fetchClientSitemapPages } from '../../hooks/useSitemapData'
import { Hint, Stat, StatRow, AddTile, SortableList, SortableItem, DragHandle, DragPreview, PeriodPills, periodOrder } from '../../components'
import { useClientRoute } from '../../hooks'
import { useClientView } from '../../hooks/useClientView'
import { ClientTabs } from '../../components/ClientTabs'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu'
import { clientPath } from '../../lib/clientRoutes'
import { useClientRetainers } from '../../hooks/useClientRetainers'
import { useOkrData } from '../../hooks/useOkrData'
import { useFutureTasks } from '../../hooks/useFutureTasks'
import { useTemplates } from '../../contexts/TemplateContext'
import { SCOPE_OPTIONS, TEMPLATE_CATEGORIES } from '../../lib/taskLibrary'
import {
  HOURLY_RATE, DEFAULT_OFFSITE_ALLOWANCE,
  DEFAULT_ADHOC_PERCENT, DEFAULT_ACCOUNT_MANAGEMENT_PERCENT,
  AM_HOUR_TARGET, SEO_HOUR_TARGET,
  roundToHalf, formatHours, formatCurrency,
  calculatePeriodMonths, getPeriodLabel, generateId
} from '../../lib/constants'

const SCOPE_ICONS = {
  'sitewide': Globe,
  'specific-pages': FileText,
  'keyword-group': Hash,
}

const MONTH_OPTIONS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
]

// Build a planner objective from a resolved template (shared by the Add
// Objective modal and the "Add Reporting & Planning" shortcut).
function buildObjectiveFromTemplate(template) {
  return {
    id: generateId(),
    title: template.title,
    scope: template.defaultScope,
    scopeDetail: '',
    isActioned: true,
    notActionedReason: '',
    linkedPageIds: [],
    keyResults: template.resolvedTasks.map(task => ({
      id: generateId(),
      task: task.name,
      description: '',
      internalNotes: '',
      amHours: task.defaultAmHours,
      seoHours: task.defaultSeoHours,
    })),
  }
}

// ─── Main Component ──────────────────────────────────────────────

export default function OkrPlanner() {
  const { client, clientId, clients, clientsLoading, updateClient, deleteClient } = useClientRoute()

  // ─── Data from Supabase ──────────────────────────────────
  const {
    periods, setPeriods, loading, error, saving,
    savePeriod, setPublished, removePeriod, refetch,
  } = useOkrData(clientId)

  const { seoRetainer: clientSeoRetainer } = useClientRetainers(clientId)
  const future = useFutureTasks(clientId)
  const { takeObjectives: takeFutureObjectives } = future
  const {
    tasks: libraryTasks,
    allTemplatesResolved,
    addTask: addTaskToLibrary,
    addTemplate: addTemplateToLibrary,
    addTaskToTemplate,
  } = useTemplates()

  const abbreviation = client?.abbreviation || ''

  // ─── State ───────────────────────────────────────────────
  // The platform's Client view (the switch in the header) shows the
  // client's report; the tabs here only choose between the plan and the
  // future tasks while it is off.
  const { clientView: isClientView } = useClientView()
  const [viewMode, setViewMode] = useState('internal')
  const [selectedPeriodId, setSelectedPeriodId] = useState(null)
  const [collapsedObjectives, setCollapsedObjectives] = useState({})
  // Client view keeps its own period, so peeking at it never moves the one being edited
  const [clientPeriodId, setClientPeriodId] = useState(null)
  const [confirmDeletePeriod, setConfirmDeletePeriod] = useState(null)
  // Tasks whose internal-notes box is open while still empty
  const [openNotes, setOpenNotes] = useState(() => new Set())
  const [deletedObjective, setDeletedObjective] = useState(null)
  const [movedToFuture, setMovedToFuture] = useState(null)
  const [savedToLibraryObjId, setSavedToLibraryObjId] = useState(null)

  // Modal states
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false)
  const [showAddObjectiveModal, setShowAddObjectiveModal] = useState(false)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [addTaskObjectiveId, setAddTaskObjectiveId] = useState(null)
  const [showEditClient, setShowEditClient] = useState(false)
  const [showMondayPush, setShowMondayPush] = useState(false)
  // The client's sitemap pages, when they have one. Null means no sitemap:
  // objectives then use the free-text scope detail alone.
  const [sitemapPages, setSitemapPages] = useState(null)
  const [linkingObjectiveId, setLinkingObjectiveId] = useState(null)
  const [pushedPeriodIds, setPushedPeriodIds] = useState(() => new Set())
  // Future tasks tab: the Add objective modal (null = closed; category may be
  // null for "no preset") and the Add task modal's objective.
  const [futureAdd, setFutureAdd] = useState(null)
  const [futureAddTaskObjId, setFutureAddTaskObjId] = useState(null)

  const isFutureView = !isClientView && viewMode === 'future'

  // Select first period when data loads, or the one the link names
  // (/okr/:client?period=<id>, from Results), in both views.
  const [searchParams] = useSearchParams()
  const wantedPeriodId = searchParams.get('period')
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      const wanted = wantedPeriodId && periods.find(p => p.id === wantedPeriodId)
      setSelectedPeriodId(wanted ? wanted.id : periods[0].id)
      if (wanted?.isPublished) setClientPeriodId(wanted.id)
    }
  }, [periods, selectedPeriodId, wantedPeriodId])

  useEffect(() => {
    let cancelled = false
    fetchClientSitemapPages(clientId).then(pages => { if (!cancelled) setSitemapPages(pages) })
    return () => { cancelled = true }
  }, [clientId])

  // ─── Debounced Auto-Save + Unsaved Changes Tracking ─────
  const saveTimerRef = useRef(null)
  const savedTimerRef = useRef(null)
  const [saveError, setSaveError] = useState(null)
  // 'idle' | 'unsaved' | 'saved'
  const [saveStatus, setSaveStatus] = useState('idle')

  const hasUnsavedChanges = saveStatus === 'unsaved' || saving || future.hasUnsavedChanges

  const triggerDebouncedSave = useCallback((periodId) => {
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      setPeriods(current => {
        const period = current.find(p => p.id === periodId)
        if (period) {
          savePeriod(period)
            .then(() => {
              setSaveStatus('saved')
              setSaveError(null)
              if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
              savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
            })
            .catch(err => {
              console.error('Auto-save failed:', err)
              const detail = err?.message || err?.details || ''
              setSaveError(
                detail
                  ? `Save failed: ${detail}`
                  : 'Could not save. Check your connection and try again.'
              )
              setSaveStatus('unsaved')
            })
        }
        return current
      })
    }, 1500)
  }, [savePeriod, setPeriods])

  // Retry save immediately (used by error banner)
  const retrySave = useCallback(() => {
    setSaveError(null)
    const period = periods.find(p => p.id === selectedPeriodId)
    if (!period) return
    savePeriod(period)
      .then(() => {
        setSaveStatus('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      })
      .catch(err => {
        console.error('Retry save failed:', err)
        const detail = err?.message || err?.details || ''
        setSaveError(
          detail
            ? `Save failed: ${detail}`
            : 'Could not save. Check your connection and try again.'
        )
        setSaveStatus('unsaved')
      })
  }, [periods, selectedPeriodId, savePeriod])

  // Flush pending save on unmount instead of dropping it
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        // Fire the save immediately on unmount
        // We read state via ref-style setter to get the latest
        setPeriods(current => {
          const period = current.find(p => p.id === selectedPeriodId)
          if (period) {
            savePeriod(period).catch(() => {})
          }
          return current
        })
      }
    }
  }, [selectedPeriodId, savePeriod, setPeriods])

  // ─── Navigation Guards ──────────────────────────────────
  // Warn on tab close / refresh
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Guarded navigation for in-app links
  const navigate = useNavigate()
  const guardedNavigate = useCallback((to) => {
    if (!hasUnsavedChanges || window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
      navigate(to)
    }
  }, [hasUnsavedChanges, navigate])

  // ─── Derived ─────────────────────────────────────────────
  const currentPeriod = periods.find(p => p.id === selectedPeriodId) || null

  // Client view shows shared periods only; it keeps its own selection
  const sharedPeriods = periods.filter(p => p.isPublished)
  const clientPeriod = sharedPeriods.find(p => p.id === clientPeriodId)
    || sharedPeriods.find(p => p.id === selectedPeriodId)
    || sharedPeriods[0] || null
  const visiblePeriods = periods

  const calc = useMemo(() => {
    if (!currentPeriod) return null
    const retainerAmount = currentPeriod.seoRetainer ?? clientSeoRetainer
    const months = calculatePeriodMonths(
      currentPeriod.startMonth, currentPeriod.startYear,
      currentPeriod.endMonth, currentPeriod.endYear
    )
    const gross = retainerAmount * months
    const offsiteDeduction = gross * (currentPeriod.offsiteAllowancePercent / 100)
    const net = gross - offsiteDeduction
    const baseHours = roundToHalf(net / HOURLY_RATE)

    // Offsite (baked into baseHours) and ad hoc reduce the whole pool equally
    const adHocPercent = currentPeriod.adHocPercent ?? DEFAULT_ADHOC_PERCENT
    const bufferHours = roundToHalf(baseHours * (adHocPercent / 100))
    const netPool = roundToHalf(baseHours - bufferHours)

    // Account Management is a % of base hours reserved from AM capacity alone
    const accountManagementPercent =
      currentPeriod.accountManagementPercent ?? DEFAULT_ACCOUNT_MANAGEMENT_PERCENT
    const accountManagementHours = roundToHalf(baseHours * (accountManagementPercent / 100))

    // Remaining for OKR tasks = pool minus the AM reservation
    const availableForObjectives = roundToHalf(netPool - accountManagementHours)

    // Sum hours across all objectives (reporting objectives included).
    // Account Management is a pre-deduction, so it is NOT counted here.
    let totalSeoHours = 0
    let totalAmHours = 0
    for (const obj of currentPeriod.objectives) {
      for (const kr of obj.keyResults) {
        totalSeoHours += kr.seoHours
        totalAmHours += kr.amHours
      }
    }
    totalSeoHours = roundToHalf(totalSeoHours)
    totalAmHours = roundToHalf(totalAmHours)
    const totalObjectiveHours = roundToHalf(totalSeoHours + totalAmHours)
    const remainingHours = roundToHalf(availableForObjectives - totalObjectiveHours)

    // Ideal split: SEO untouched by AM reservation; AM ideal reduced by it
    const idealSeoHours = roundToHalf(netPool * SEO_HOUR_TARGET)
    const idealAmHours = roundToHalf(netPool * AM_HOUR_TARGET - accountManagementHours)

    return {
      retainerAmount, months, gross, offsiteDeduction, net, baseHours, bufferHours,
      adHocPercent, accountManagementPercent, accountManagementHours,
      availableForObjectives, totalSeoHours, totalAmHours,
      totalObjectiveHours, remainingHours, idealSeoHours, idealAmHours,
    }
  }, [currentPeriod, clientSeoRetainer])

  // ─── Period Handlers ─────────────────────────────────────

  const updatePeriod = useCallback((periodId, updates) => {
    setPeriods(prev => {
      const next = prev.map(p => p.id === periodId ? { ...p, ...updates } : p)
      return next
    })
    triggerDebouncedSave(periodId)
  }, [setPeriods, triggerDebouncedSave])

  // `pull` names future objectives to bring in: { ids, keep }.
  const addPeriod = useCallback((period, pull) => {
    const newPeriod = {
      ...period,
      objectives: [...period.objectives, ...takeFutureObjectives(pull?.ids, { keep: pull?.keep })],
    }
    setPeriods(prev => [...prev, newPeriod])
    setSelectedPeriodId(newPeriod.id)
    setShowNewPeriodModal(false)
    savePeriod(newPeriod).catch(err => console.error('Failed to save new period:', err))
  }, [setPeriods, savePeriod, takeFutureObjectives])

  // `fields` are the new period's dates and goal, chosen in the modal.
  const duplicatePeriod = useCallback((sourcePeriodId, objectiveIds, pull, fields = {}) => {
    const source = periods.find(p => p.id === sourcePeriodId)
    if (!source) return
    // Only carry over the chosen objectives (all of them when unspecified)
    const keep = objectiveIds
      ? source.objectives.filter(o => objectiveIds.includes(o.id))
      : source.objectives
    const newPeriod = {
      ...source,
      ...fields,
      id: generateId(),
      isPublished: false,
      objectives: [
        ...keep.map(obj => ({
          ...obj,
          id: generateId(),
          keyResults: obj.keyResults.map(kr => ({
            ...kr,
            id: generateId(),

          })),
        })),
        ...takeFutureObjectives(pull?.ids, { keep: pull?.keep }),
      ],
    }
    setPeriods(prev => [...prev, newPeriod])
    setSelectedPeriodId(newPeriod.id)
    setShowNewPeriodModal(false)
    savePeriod(newPeriod).catch(err => console.error('Failed to save duplicated period:', err))
  }, [periods, setPeriods, savePeriod, takeFutureObjectives])

  const deletePeriod = useCallback((periodId) => {
    setPeriods(prev => {
      const updated = prev.filter(p => p.id !== periodId)
      if (selectedPeriodId === periodId) {
        setSelectedPeriodId(updated[0]?.id || null)
      }
      return updated
    })
    removePeriod(periodId).catch(err => console.error('Failed to delete period:', err))
  }, [selectedPeriodId, setPeriods, removePeriod])

  // ─── Objective Handlers ──────────────────────────────────

  const addObjective = useCallback((periodId, objective) => {
    setPeriods(prev => prev.map(p =>
      p.id === periodId
        ? { ...p, objectives: [...p.objectives, objective] }
        : p
    ))
    setShowAddObjectiveModal(false)
    triggerDebouncedSave(periodId)
  }, [setPeriods, triggerDebouncedSave])

  // Pull future objectives into the open period.
  const addFutureObjectives = useCallback((periodId, ids, keep) => {
    const pulled = takeFutureObjectives(ids, { keep })
    if (!pulled.length) return
    setPeriods(prev => prev.map(p =>
      p.id === periodId
        ? { ...p, objectives: [...p.objectives, ...pulled] }
        : p
    ))
    setShowAddObjectiveModal(false)
    triggerDebouncedSave(periodId)
  }, [takeFutureObjectives, setPeriods, triggerDebouncedSave])

  const updateObjective = useCallback((periodId, objectiveId, updates) => {
    setPeriods(prev => prev.map(p =>
      p.id === periodId
        ? {
          ...p,
          objectives: p.objectives.map(o =>
            o.id === objectiveId ? { ...o, ...updates } : o
          ),
        }
        : p
    ))
    triggerDebouncedSave(periodId)
  }, [setPeriods, triggerDebouncedSave])

  const deleteObjective = useCallback((periodId, objectiveId) => {
    setPeriods(prev => {
      const period = prev.find(p => p.id === periodId)
      if (period) {
        const index = period.objectives.findIndex(o => o.id === objectiveId)
        if (index !== -1) {
          setDeletedObjective({ periodId, objective: period.objectives[index], index })
        }
      }
      return prev.map(p =>
        p.id === periodId
          ? { ...p, objectives: p.objectives.filter(o => o.id !== objectiveId) }
          : p
      )
    })
    triggerDebouncedSave(periodId)
  }, [setPeriods, triggerDebouncedSave])

  // Send an objective back to the client's future tasks, filed under the
  // category of the template it came from (matched by title) when there is one.
  const sendObjectiveToFuture = useCallback((periodId, objectiveId) => {
    const period = periods.find(p => p.id === periodId)
    const index = period ? period.objectives.findIndex(o => o.id === objectiveId) : -1
    if (index === -1) return
    const objective = period.objectives[index]
    const title = (objective.title || '').trim().toLowerCase()
    const template = allTemplatesResolved.find(t => (t.title || '').trim().toLowerCase() === title)
    const added = future.addObjective({
      title: objective.title,
      scope: objective.scope,
      scopeDetail: objective.scopeDetail,
      category: template?.category || null,
      keyResults: objective.keyResults.map(kr => ({ ...kr, id: generateId() })),
    })
    setPeriods(prev => prev.map(p =>
      p.id === periodId
        ? { ...p, objectives: p.objectives.filter(o => o.id !== objectiveId) }
        : p
    ))
    setMovedToFuture({ periodId, objective, index, futureId: added.id })
    triggerDebouncedSave(periodId)
  }, [periods, allTemplatesResolved, future, setPeriods, triggerDebouncedSave])

  const undoSendToFuture = useCallback(() => {
    if (!movedToFuture) return
    const { periodId, objective, index, futureId } = movedToFuture
    future.removeObjective(futureId)
    setPeriods(prev => prev.map(p => {
      if (p.id !== periodId) return p
      const objectives = [...p.objectives]
      objectives.splice(index, 0, objective)
      return { ...p, objectives }
    }))
    setMovedToFuture(null)
    triggerDebouncedSave(periodId)
  }, [movedToFuture, future, setPeriods, triggerDebouncedSave])

  const undoDeleteObjective = useCallback(() => {
    if (!deletedObjective) return
    const { periodId, objective, index } = deletedObjective
    setPeriods(prev => prev.map(p => {
      if (p.id !== periodId) return p
      const objectives = [...p.objectives]
      objectives.splice(index, 0, objective)
      return { ...p, objectives }
    }))
    setDeletedObjective(null)
    triggerDebouncedSave(deletedObjective.periodId)
  }, [deletedObjective, setPeriods, triggerDebouncedSave])

  // Put the period's objectives in this order (drag and drop in the grid)
  const reorderObjectives = useCallback((periodId, orderedIds) => {
    setPeriods(prev => prev.map(p => {
      if (p.id !== periodId) return p
      const byId = new Map(p.objectives.map(o => [o.id, o]))
      return { ...p, objectives: orderedIds.map(id => byId.get(id)).filter(Boolean) }
    }))
    triggerDebouncedSave(periodId)
  }, [setPeriods, triggerDebouncedSave])

  const duplicateObjective = useCallback((periodId, objectiveId) => {
    setPeriods(prev => prev.map(p => {
      if (p.id !== periodId) return p
      const source = p.objectives.find(o => o.id === objectiveId)
      if (!source) return p
      const copy = {
        ...source,
        id: generateId(),
        title: `${source.title} (Copy)`,
        keyResults: source.keyResults.map(kr => ({
          ...kr,
          id: generateId(),

        })),
      }
      return { ...p, objectives: [...p.objectives, copy] }
    }))
    triggerDebouncedSave(periodId)
  }, [setPeriods, triggerDebouncedSave])

  const toggleCollapse = useCallback((objectiveId) => {
    setCollapsedObjectives(prev => ({
      ...prev,
      [objectiveId]: !prev[objectiveId],
    }))
  }, [])

  // ─── Key Result Handlers ─────────────────────────────────

  const addKeyResult = useCallback((periodId, objectiveId, keyResult) => {
    setPeriods(prev => prev.map(p =>
      p.id === periodId
        ? {
          ...p,
          objectives: p.objectives.map(o =>
            o.id === objectiveId
              ? { ...o, keyResults: [...o.keyResults, keyResult] }
              : o
          ),
        }
        : p
    ))
    setShowAddTaskModal(false)
    setAddTaskObjectiveId(null)
    triggerDebouncedSave(periodId)
  }, [setPeriods, triggerDebouncedSave])

  const updateKeyResult = useCallback((periodId, objectiveId, krId, updates) => {
    setPeriods(prev => prev.map(p =>
      p.id === periodId
        ? {
          ...p,
          objectives: p.objectives.map(o =>
            o.id === objectiveId
              ? {
                ...o,
                keyResults: o.keyResults.map(kr =>
                  kr.id === krId ? { ...kr, ...updates } : kr
                ),
              }
              : o
          ),
        }
        : p
    ))
    triggerDebouncedSave(periodId)
  }, [setPeriods, triggerDebouncedSave])

  const deleteKeyResult = useCallback((periodId, objectiveId, krId) => {
    setPeriods(prev => prev.map(p =>
      p.id === periodId
        ? {
          ...p,
          objectives: p.objectives.map(o =>
            o.id === objectiveId
              ? { ...o, keyResults: o.keyResults.filter(kr => kr.id !== krId) }
              : o
          ),
        }
        : p
    ))
    triggerDebouncedSave(periodId)
  }, [setPeriods, triggerDebouncedSave])

  const duplicateKeyResult = useCallback((periodId, objectiveId, krId) => {
    setPeriods(prev => prev.map(p => {
      if (p.id !== periodId) return p
      return {
        ...p,
        objectives: p.objectives.map(o => {
          if (o.id !== objectiveId) return o
          const source = o.keyResults.find(kr => kr.id === krId)
          if (!source) return o
          const copy = { ...source, id: generateId() }
          return { ...o, keyResults: [...o.keyResults, copy] }
        }),
      }
    }))
    triggerDebouncedSave(periodId)
  }, [setPeriods, triggerDebouncedSave])

  // Add a blank, objective-only task (not promoted to the master library)
  const addBlankKeyResult = useCallback((periodId, objectiveId) => {
    addKeyResult(periodId, objectiveId, {
      id: generateId(),
      task: '',
      description: '',
      internalNotes: '',
      amHours: 0,
      seoHours: 0,
    })
  }, [addKeyResult])

  // Put an objective's tasks in this order; sort_order persists via savePeriod
  const reorderKeyResults = useCallback((periodId, objectiveId, orderedIds) => {
    setPeriods(prev => prev.map(p => {
      if (p.id !== periodId) return p
      return {
        ...p,
        objectives: p.objectives.map(o => {
          if (o.id !== objectiveId) return o
          const byId = new Map(o.keyResults.map(kr => [kr.id, kr]))
          return { ...o, keyResults: orderedIds.map(id => byId.get(id)).filter(Boolean) }
        }),
      }
    }))
    triggerDebouncedSave(periodId)
  }, [setPeriods, triggerDebouncedSave])

  // Promote a whole objective (title + scope + its key results) into the
  // master template library as a reusable objective template.
  const saveObjectiveToLibrary = useCallback((obj) => {
    (async () => {
      const taskIds = []
      for (const kr of obj.keyResults) {
        const name = (kr.task || '').trim()
        if (!name) continue
        // Reuse an identical library task if one already exists, else create it
        const existing = libraryTasks.find(t =>
          t.name === name &&
          t.defaultAmHours === kr.amHours &&
          t.defaultSeoHours === kr.seoHours
        )
        const task = existing || await addTaskToLibrary({
          name, defaultAmHours: kr.amHours, defaultSeoHours: kr.seoHours,
        })
        if (task) taskIds.push(task.id)
      }
      const tpl = await addTemplateToLibrary({
        title: (obj.title || '').trim() || 'Untitled Objective',
        defaultScope: obj.scope || 'sitewide',
        tasks: [],
      })
      if (tpl) {
        for (const id of taskIds) await addTaskToTemplate(tpl.id, id)
      }
      setSavedToLibraryObjId(obj.id)
      setTimeout(() => setSavedToLibraryObjId(null), 2000)
    })().catch(err => console.error('Save objective to library failed:', err))
  }, [libraryTasks, addTaskToLibrary, addTemplateToLibrary, addTaskToTemplate])

  const openMondayPush = useCallback(() => {
    if (!currentPeriod) return
    // Duplicate-push guard: Monday subitems aren't idempotent, so warn if this
    // period was already pushed in the current session.
    if (pushedPeriodIds.has(currentPeriod.id)) {
      const again = window.confirm(
        'This period was already pushed to Monday in this session. Pushing again will create duplicate subitems. Continue?'
      )
      if (!again) return
    }
    setShowMondayPush(true)
  }, [currentPeriod, pushedPeriodIds])

  // ─── Guard: client list still loading (the URL names the client) ──

  if (!client && clientsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-pink" />
      </div>
    )
  }

  // ─── Guard: client not found ─────────────────────────────

  if (!client) {
    return (
      <div className="text-center py-20">
        <p className="text-ink-soft">Client not found.</p>
        <Link to="/clients" className="text-pink hover:text-pink-dark mt-2 inline-block">
          ← Back to clients
        </Link>
      </div>
    )
  }

  // ─── Guard: loading ────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={clientPath('clients', client)} className="text-ink-faint hover:text-ink-soft" aria-label={`Back to ${client.name}`}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-light tracking-tight text-ink">{client.name}</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-pink" />
          <span className="ml-2 text-ink-soft">Loading the SEO plan...</span>
        </div>
      </div>
    )
  }

  // ─── Guard: error ──────────────────────────────────────

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={clientPath('clients', client)} className="text-ink-faint hover:text-ink-soft" aria-label={`Back to ${client.name}`}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-light tracking-tight text-ink">{client.name}</h1>
        </div>
        <div className="text-center py-20">
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="text-pink hover:text-pink-dark font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className={isClientView ? '' : 'max-w-7xl mx-auto'}>

      {/* Save Error Banner — sticky until dismissed or retried */}
      {saveError && (
        <div className="mb-4 bg-red-50 rounded-2xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-700 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{saveError}</p>
          <button
            onClick={retrySave}
            className="text-xs font-medium text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-full transition-colors shrink-0"
          >
            Retry
          </button>
          <button
            onClick={() => setSaveError(null)}
            className="text-red-700/60 hover:text-red-700 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header. In Client view the report carries the name and period, so only the tabs stay. */}
      <ClientTabs client={client} />
      {!isClientView && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => guardedNavigate(clientPath('clients', client))} className="text-ink-faint hover:text-ink-soft" aria-label={`Back to ${client.name}`}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-light tracking-tight text-ink flex items-center gap-2">
              {client.name}
              <button
                onClick={() => setShowEditClient(true)}
                className="text-sage-deep hover:text-ink-soft transition-colors"
                title="Edit client"
              >
                <Pencil size={16} />
              </button>
              {saving ? (
                <span className="ml-3 text-xs font-normal text-ink-faint inline-flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  Saving...
                </span>
              ) : saveError ? (
                <span className="ml-3 text-xs font-normal text-red-600 inline-flex items-center gap-1">
                  <Circle size={8} fill="currentColor" />
                  Save failed
                </span>
              ) : saveStatus === 'unsaved' ? (
                <span className="ml-3 text-xs font-normal text-amber-500 inline-flex items-center gap-1">
                  <Circle size={8} fill="currentColor" />
                  Unsaved changes
                </span>
              ) : saveStatus === 'saved' ? (
                <span className="ml-3 text-xs font-normal text-emerald-600 inline-flex items-center gap-1">
                  <Check size={12} />
                  Saved
                </span>
              ) : null}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle — shadcn Tabs */}
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="internal" title="The period's objectives, tasks and hours.">
                Plan
              </TabsTrigger>
              <TabsTrigger
                value="future"
                title="Everything we might do for this client, by category. Pull from it when creating a period or adding an objective."
              >
                Future tasks
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Action Buttons (internal only) */}
          {viewMode === 'internal' && currentPeriod && (
            <>
              <button
                onClick={openMondayPush}
                title="Create this period's tasks on the SEO Project Management board in Monday"
                className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-full bg-ink text-white hover:bg-ink/80 transition-colors"
              >
                <Upload size={16} />
                Push to Monday
              </button>
              <SharedSwitch
                on={!!currentPeriod.isPublished}
                onChange={newVal => {
                  setPeriods(prev => prev.map(p =>
                    p.id === currentPeriod.id ? { ...p, isPublished: newVal } : p
                  ))
                  setPublished(currentPeriod.id, newVal).catch(err => {
                    console.error('Failed to change sharing:', err)
                    setPeriods(prev => prev.map(p =>
                      p.id === currentPeriod.id ? { ...p, isPublished: !newVal } : p
                    ))
                  })
                }}
              />
            </>
          )}
        </div>
      </div>
      )}

      {/* ── Future Tasks ───────────────────────────────────── */}
      {isFutureView ? (
          <div key="future">
            <FutureTasks
              clientName={client.name}
              future={future}
              onAddObjective={category => setFutureAdd({ category })}
              onAddTask={objectiveId => setFutureAddTaskObjId(objectiveId)}
            />
          </div>
        ) : isClientView ? (
          <div key="client">
            {clientPeriod ? (
              <ClientView
                clientId={clientId}
                clientName={client.name}
                period={clientPeriod}
                allPeriods={periods}
                goal={clientPeriod.goal}
                objectives={clientPeriod.objectives}
                sitemapPages={sitemapPages}
                periods={sharedPeriods}
                selectedPeriodId={clientPeriod.id}
                onPeriodChange={setClientPeriodId}
              />
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-sage-line max-w-lg mx-auto">
                <h3 className="text-lg font-medium text-ink mb-2">Nothing shared with the client yet</h3>
                <p className="text-ink-soft text-sm">
                  Turn Client view off and switch on "Shared with client" for a period.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div key="internal">

      {/* Over-allocation Warning */}
      {calc && calc.remainingHours < 0 && (
        <div className="mb-6 bg-red-50 rounded-2xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">
              Over-allocated by {formatHours(Math.abs(calc.remainingHours))}
            </p>
            <p className="text-sm text-red-700/80 mt-0.5">
              Reduce task hours or increase the retainer to bring this back into balance.
            </p>
          </div>
        </div>
      )}

      {/* The periods, oldest to newest, with the next one on the end */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <PeriodPills
          periods={[...visiblePeriods].sort((a, b) => periodOrder(a) - periodOrder(b)).map(p => ({
            id: p.id,
            label: getPeriodLabel(p.startMonth, p.startYear, p.endMonth, p.endYear),
            note: p.isPublished ? null : 'not shared',
          }))}
          value={selectedPeriodId}
          onChange={setSelectedPeriodId}
          onNew={() => setShowNewPeriodModal(true)}
        />
        {currentPeriod && (
          <button
            onClick={() => setConfirmDeletePeriod(currentPeriod)}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
          >
            <Trash2 size={14} />
            Delete period
          </button>
        )}
      </div>

      {/* No period state */}
      {!currentPeriod && (
        <div className="text-center py-20 bg-white rounded-3xl border border-sage-line">
          <h3 className="text-lg font-medium text-ink mb-2">No periods yet</h3>
          <p className="text-sm text-ink-soft mb-6 max-w-sm mx-auto">
            Create the first period to plan objectives and allocate the retainer's hours.
          </p>
          <button
            onClick={() => setShowNewPeriodModal(true)}
            className="inline-flex items-center gap-1.5 h-9 px-5 text-sm font-medium rounded-full bg-pink text-white hover:bg-pink-dark transition-colors"
          >
            <Plus size={16} />
            New period
          </button>
        </div>
      )}

      {/* Period Content */}
      {currentPeriod && (
        <>
          {/* Period Details */}
          <div className="bg-white rounded-2xl border border-sage-line p-5 mb-6">
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-ink-soft">Start</label>
                <select
                  value={currentPeriod.startMonth}
                  onChange={e => updatePeriod(currentPeriod.id, { startMonth: Number(e.target.value) })}
                  className="h-8 px-2.5 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
                >
                  {MONTH_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={currentPeriod.startYear}
                  onChange={e => updatePeriod(currentPeriod.id, { startYear: Number(e.target.value) })}
                  className="w-20 h-8 px-2.5 tabular-nums rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-ink-soft">End</label>
                <select
                  value={currentPeriod.endMonth}
                  onChange={e => updatePeriod(currentPeriod.id, { endMonth: Number(e.target.value) })}
                  className="h-8 px-2.5 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
                >
                  {MONTH_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={currentPeriod.endYear}
                  onChange={e => updatePeriod(currentPeriod.id, { endYear: Number(e.target.value) })}
                  className="w-20 h-8 px-2.5 tabular-nums rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-ink-soft block mb-1">Goal</label>
              <input
                type="text"
                value={currentPeriod.goal}
                onChange={e => updatePeriod(currentPeriod.id, { goal: e.target.value })}
                placeholder="e.g. More enquiries from Google for custom homes"
                className="w-full h-9 px-3.5 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
              />
            </div>
          </div>

          {/* Hours: one line, with the workings on demand */}
          {calc && (
            <details className="mb-6 rounded-3xl border border-sage-line bg-white">
              <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-6 gap-y-1 px-6 py-4 [&::-webkit-details-marker]:hidden">
                <span className="flex items-baseline gap-2">
                  <span className={`text-2xl font-light tabular-nums ${calc.remainingHours < 0 ? 'text-red-600' : 'text-ink'}`}>{formatHours(Math.abs(calc.remainingHours))}</span>
                  <span className="text-sm text-ink-soft">{calc.remainingHours < 0 ? 'over the hours available' : 'left to plan'}</span>
                </span>
                <span className="text-sm tabular-nums text-ink-soft">
                  {formatHours(calc.totalObjectiveHours)} planned of {formatHours(calc.availableForObjectives)} · SEO {formatHours(calc.totalSeoHours)} · AM {formatHours(calc.totalAmHours)}
                </span>
                <span className="text-sm tabular-nums text-ink-faint">{formatCurrency(calc.retainerAmount)}/mo × {calc.months} mo</span>
                <span className="ml-auto text-xs font-medium text-pink">Show workings</span>
              </summary>
              <div className="border-t border-sage-line px-6 py-5">
                <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
                  <label htmlFor="okr-period-retainer" className="text-ink-soft">SEO retainer for this period</label>
                  <span className="text-ink-faint">$</span>
                  <input
                    id="okr-period-retainer"
                    type="number"
                    min="0"
                    step="100"
                    value={currentPeriod.seoRetainer ?? clientSeoRetainer}
                    onChange={e => updatePeriod(currentPeriod.id, { seoRetainer: e.target.value === '' ? null : Number(e.target.value) })}
                    className="w-24 h-8 px-2.5 text-sm font-medium tabular-nums rounded-lg border border-sage-line bg-white text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
                  />
                  {currentPeriod.seoRetainer != null && currentPeriod.seoRetainer !== clientSeoRetainer ? (
                    <button type="button" onClick={() => updatePeriod(currentPeriod.id, { seoRetainer: null })} className="text-xs text-ink-faint hover:text-ink">
                      reset to the client's {formatCurrency(clientSeoRetainer)}
                    </button>
                  ) : (
                    <span className="text-xs text-ink-faint">the client's retainer, from Edit client</span>
                  )}
                </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:divide-x md:divide-sage-line md:[&>*]:px-6 md:[&>*:first-child]:pl-0 md:[&>*:last-child]:pr-0">
              {/* Retainer Calculation */}
              <div>
                <h3 className="text-sm font-medium text-ink mb-3">Retainer</h3>
                <div className="space-y-1.5 text-sm tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-ink-soft">{formatCurrency(calc.retainerAmount)}/mo × {calc.months} mo</span>
                    <span className="font-medium text-ink">{formatCurrency(calc.gross)}</span>
                  </div>
                  <div className="flex justify-between text-ink-faint">
                    <span>Offsite ({currentPeriod.offsiteAllowancePercent}%)</span>
                    <span>−{formatCurrency(calc.offsiteDeduction)}</span>
                  </div>
                  <div className="flex justify-between border-t border-sage-line pt-1.5">
                    <span className="text-ink-soft">Net retainer</span>
                    <span className="font-medium text-ink">{formatCurrency(calc.net)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-soft">÷ ${HOURLY_RATE}/hr</span>
                    <span className="font-medium text-ink">{formatHours(calc.baseHours)}</span>
                  </div>
                </div>
              </div>

              {/* Buffers & Allowances — the three editable % controls */}
              <div>
                <h3 className="text-sm font-medium text-ink mb-3">Buffers &amp; allowances</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-soft inline-flex items-center gap-1">Offsite <Hint>Share of the retainer spent on off-site work such as link building. Taken off the dollars before they are converted to hours.</Hint></span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={currentPeriod.offsiteAllowancePercent ?? DEFAULT_OFFSITE_ALLOWANCE}
                        onChange={e => updatePeriod(currentPeriod.id, { offsiteAllowancePercent: Number(e.target.value) || 0 })}
                        min={0}
                        max={100}
                        className="w-14 h-7 px-1.5 text-sm text-center tabular-nums rounded-lg border border-sage-line bg-white text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
                      />
                      <span className="text-xs text-ink-faint">%</span>
                      <span className="w-20 text-right text-ink-faint tabular-nums">−{formatCurrency(calc.offsiteDeduction)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-soft inline-flex items-center gap-1">Ad hoc <Hint>Hours held back for unplanned requests during the period, so the objectives do not use every hour.</Hint></span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={currentPeriod.adHocPercent ?? DEFAULT_ADHOC_PERCENT}
                        onChange={e => updatePeriod(currentPeriod.id, { adHocPercent: Number(e.target.value) || 0 })}
                        min={0}
                        max={100}
                        className="w-14 h-7 px-1.5 text-sm text-center tabular-nums rounded-lg border border-sage-line bg-white text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
                      />
                      <span className="text-xs text-ink-faint">%</span>
                      <span className="w-20 text-right text-ink-faint tabular-nums">−{formatHours(calc.bufferHours)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-soft inline-flex items-center gap-1">Account management <Hint>Hours reserved for account management, taken from the pool before the SEO plan's tasks are allocated.</Hint></span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={currentPeriod.accountManagementPercent ?? DEFAULT_ACCOUNT_MANAGEMENT_PERCENT}
                        onChange={e => updatePeriod(currentPeriod.id, { accountManagementPercent: Number(e.target.value) || 0 })}
                        min={0}
                        max={100}
                        className="w-14 h-7 px-1.5 text-sm text-center tabular-nums rounded-lg border border-sage-line bg-white text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
                      />
                      <span className="text-xs text-ink-faint">%</span>
                      <span className="w-20 text-right text-ink-faint tabular-nums">−{formatHours(calc.accountManagementHours)} AM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Available for Objectives */}
              <div>
                <h3 className="text-sm font-medium text-ink mb-3">Available</h3>
                <div className="space-y-1.5 text-sm tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Base hours</span>
                    <span>{formatHours(calc.baseHours)}</span>
                  </div>
                  <div className="flex justify-between text-ink-faint">
                    <span>Ad hoc</span>
                    <span>−{formatHours(calc.bufferHours)}</span>
                  </div>
                  <div className="flex justify-between text-ink-faint">
                    <span>Account management</span>
                    <span>−{formatHours(calc.accountManagementHours)}</span>
                  </div>
                  <div className="flex justify-between border-t border-sage-line pt-1.5">
                    <span className="font-medium text-ink">Available for tasks</span>
                    <span className="font-medium text-ink">{formatHours(calc.availableForObjectives)}</span>
                  </div>
                </div>
              </div>
            </div>

          {/* AM/SEO Split */}
            <section className="mt-6">
              <h3 className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink">AM / SEO split <Hint>How the allocated task hours divide between account management and SEO delivery. The target is 40% AM, 60% SEO.</Hint></h3>
              <StatRow columns={4}>
                <Stat size="sm" label="SEO hours" value={formatHours(calc.totalSeoHours)} sub={`Ideal: ${formatHours(calc.idealSeoHours)} (60%)`} />
                <Stat size="sm" label="AM hours" value={formatHours(calc.totalAmHours)} sub={`Ideal: ${formatHours(calc.idealAmHours)} (40%)`} />
                <Stat size="sm" label="Total allocated" value={formatHours(calc.totalObjectiveHours)} sub={`of ${formatHours(calc.availableForObjectives)} available`} />
                <div className="min-w-0">
                  <p className="text-sm text-ink-soft">Left</p>
                  <p className={`mt-1.5 text-2xl font-light leading-none tracking-tight tabular-nums ${calc.remainingHours < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatHours(calc.remainingHours)}
                  </p>
                  <p className="mt-2 text-xs text-ink-faint">left to plan</p>
                </div>
              </StatRow>
            </section>
              </div>
            </details>
          )}

          {/* Objectives */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-ink">Objectives</h2>
            <div className="flex items-center gap-2">

            </div>
          </div>

          {(
            <SortableList
              ids={currentPeriod.objectives.map(o => o.id)}
              strategy="grid"
              onReorder={ids => reorderObjectives(currentPeriod.id, ids)}
              renderOverlay={id => {
                const o = currentPeriod.objectives.find(x => x.id === id)
                return o ? <DragPreview title={o.title} sub={`${o.keyResults.length} ${o.keyResults.length === 1 ? 'task' : 'tasks'}`} /> : null
              }}
            >
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {currentPeriod.objectives.map(obj => {
                const ScopeIcon = SCOPE_ICONS[obj.scope] || Globe
                const scopeOption = SCOPE_OPTIONS.find(s => s.id === obj.scope)
                const isCollapsed = collapsedObjectives[obj.id]
                const objTotalHours = obj.keyResults.reduce(
                  (sum, kr) => sum + kr.amHours + kr.seoHours, 0
                )

                return (
                  <SortableItem
                    key={obj.id}
                    id={obj.id}
                    className={`bg-white rounded-2xl border border-sage-line overflow-hidden transition-colors duration-200 ${
                      obj.isActioned === false ? 'opacity-60' : ''
                    }`}
                  >
                    {({ handle: objHandle }) => (<>
                    {/* Objective Header */}
                    <div className="p-4 border-b border-sage-line">
                      <div className="flex items-start justify-between gap-2">
                        <DragHandle {...objHandle} size={16} className="mt-0.5 -ml-1.5" label="Drag to move this objective" />
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={obj.title}
                            onChange={e => updateObjective(currentPeriod.id, obj.id, { title: e.target.value })}
                            className="w-full font-medium text-ink bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                          />
                          <div className="flex items-center gap-2 mt-1.5">
                            <select
                              value={obj.scope}
                              onChange={e => updateObjective(currentPeriod.id, obj.id, { scope: e.target.value })}
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 ${scopeOption?.color || 'bg-sage text-ink-soft'}`}
                            >
                              {SCOPE_OPTIONS.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>
                            <span className="text-xs text-ink-faint">{formatHours(objTotalHours)}</span>
                          </div>
                          {/* Scope detail, plus the optional link to sitemap pages */}
                          {(obj.scope === 'specific-pages' || obj.scope === 'keyword-group') && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="block text-xs text-ink-soft">
                                  {obj.scope === 'specific-pages' ? 'Pages / clusters' : 'Keyword group'}
                                </label>
                                {sitemapPages?.length > 0 && (
                                  <button
                                    onClick={() => setLinkingObjectiveId(obj.id)}
                                    title="Link this objective to pages in the client's sitemap. Optional: the note below works on its own."
                                    className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-pink transition-colors"
                                  >
                                    <Link2 size={11} /> {obj.linkedPageIds?.length ? 'Edit links' : 'Link pages'}
                                  </button>
                                )}
                              </div>
                              {obj.linkedPageIds?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {obj.linkedPageIds.map(pid => {
                                    const pg = (sitemapPages || []).find(x => x.id === pid)
                                    return (
                                      <span key={pid} className="inline-flex items-center gap-1 rounded-full border border-pink pl-2 pr-1 py-0.5 text-[11px] font-medium text-pink">
                                        {pg?.is_priority && <Flag size={9} fill="currentColor" />}
                                        <span className="max-w-[9rem] truncate">{pg ? pg.name : 'Removed page'}</span>
                                        <button
                                          onClick={() => updateObjective(currentPeriod.id, obj.id, {
                                            linkedPageIds: obj.linkedPageIds.filter(x => x !== pid),
                                          })}
                                          className="text-pink/60 hover:text-pink"
                                          title="Unlink"
                                        >
                                          <X size={9} />
                                        </button>
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                              <input
                                type="text"
                                value={obj.scopeDetail || ''}
                                onChange={e => updateObjective(currentPeriod.id, obj.id, { scopeDetail: e.target.value })}
                                placeholder={obj.scope === 'specific-pages' ? 'e.g. homepage, product pages...' : 'e.g. branded keywords...'}
                                className="w-full text-xs text-ink bg-sage-light border border-sage-line rounded-lg px-2.5 py-1 focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30 placeholder:text-ink-faint"
                              />
                            </div>
                          )}
                          {/* Actioned toggle */}
                          <button
                            title="Is this objective being worked on this period? Parked greys it out and lets you say why (the client sees the reason)."
                            onClick={() => updateObjective(currentPeriod.id, obj.id, {
                              isActioned: !obj.isActioned,
                              notActionedReason: !obj.isActioned ? '' : obj.notActionedReason,
                            })}
                            className={`mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                              obj.isActioned !== false
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-sage text-ink-soft'
                            }`}
                          >
                            {obj.isActioned !== false
                              ? <><CheckCircle size={12} /> Working on it</>
                              : <><XCircle size={12} /> Parked</>
                            }
                          </button>
                          {obj.isActioned === false && (
                            <input
                              type="text"
                              value={obj.notActionedReason || ''}
                              onChange={e => updateObjective(currentPeriod.id, obj.id, { notActionedReason: e.target.value })}
                              placeholder="Why it is parked (the client sees this)"
                              className="w-full text-xs text-ink mt-1.5 bg-sage-light border border-sage-line rounded-lg px-2.5 py-1 focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30 placeholder:text-ink-faint"
                            />
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => toggleCollapse(obj.id)}
                            className="text-sage-deep hover:text-ink-soft p-0.5"
                          >
                            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Key Results */}
                    {!isCollapsed && (
                      <div className="p-4">
                        {obj.keyResults.length === 0 ? (
                          <p className="text-sm text-sage-deep py-2">No tasks yet.</p>
                        ) : (
                          <SortableList ids={obj.keyResults.map(kr => kr.id)} onReorder={ids => reorderKeyResults(currentPeriod.id, obj.id, ids)}>
                          <ul className="space-y-2">
                            {obj.keyResults.map((kr, krIndex) => (
                              <SortableItem key={kr.id} id={kr.id} as="li" className="group flex items-start gap-2 bg-white">
                                {({ handle: krHandle }) => (<>
                                <span className="shrink-0 flex items-center gap-0.5 text-xs font-medium text-ink-faint leading-5 mt-1">
                                  <DragHandle {...krHandle} size={12} label="Drag to move this task" />
                                  <span className="w-7 text-center">{krIndex + 1}/{obj.keyResults.length}</span>
                                </span>
                                <div className="flex-1 min-w-0">
                                  <input
                                    type="text"
                                    value={kr.task}
                                    onChange={e => updateKeyResult(
                                      currentPeriod.id, obj.id, kr.id,
                                      { task: e.target.value }
                                    )}
                                    className="w-full text-sm text-ink bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    value={kr.description}
                                    onChange={e => updateKeyResult(
                                      currentPeriod.id, obj.id, kr.id,
                                      { description: e.target.value }
                                    )}
                                    placeholder="Add details..."
                                    className="w-full text-xs text-ink-faint mt-0.5 bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-ink-faint"
                                  />
                                  {(kr.internalNotes || openNotes.has(kr.id)) && (
                                  <textarea
                                    autoFocus={!kr.internalNotes}
                                    value={kr.internalNotes}
                                    onChange={e => updateKeyResult(
                                      currentPeriod.id, obj.id, kr.id,
                                      { internalNotes: e.target.value }
                                    )}
                                    placeholder="Internal notes (not visible to client)..."
                                    rows={2}
                                    onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                    title="Drag the corner to make this bigger"
                                    className="w-full mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 resize-y min-h-[3rem] focus:outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-200 placeholder:text-amber-700/40"
                                  />
                                  )}
                                  <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-ink-faint">AM</span>
                                      <input
                                        type="number"
                                        value={kr.amHours}
                                        onChange={e => updateKeyResult(
                                          currentPeriod.id, obj.id, kr.id,
                                          { amHours: roundToHalf(Number(e.target.value) || 0) }
                                        )}
                                        min={0}
                                        step={0.5}
                                        className="w-14 h-7 px-1.5 text-xs text-center tabular-nums rounded-lg border border-sage-line bg-white text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-ink-faint">SEO</span>
                                      <input
                                        type="number"
                                        value={kr.seoHours}
                                        onChange={e => updateKeyResult(
                                          currentPeriod.id, obj.id, kr.id,
                                          { seoHours: roundToHalf(Number(e.target.value) || 0) }
                                        )}
                                        min={0}
                                        step={0.5}
                                        className="w-14 h-7 px-1.5 text-xs text-center tabular-nums rounded-lg border border-sage-line bg-white text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
                                      />
                                    </div>
                                    <span className="text-xs text-ink-faint">{formatHours(kr.amHours + kr.seoHours)}</span>
                                    {!kr.internalNotes && !openNotes.has(kr.id) && (
                                      <button
                                        type="button"
                                        onClick={() => setOpenNotes(prev => new Set(prev).add(kr.id))}
                                        className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink-faint hover:text-pink transition-colors"
                                        title="Internal notes are never shown to the client"
                                      >
                                        <StickyNote size={11} /> Note
                                      </button>
                                    )}
                                    <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                      <button
                                        onClick={() => duplicateKeyResult(currentPeriod.id, obj.id, kr.id)}
                                        className="text-sage-deep hover:text-pink transition-colors"
                                        title="Duplicate task"
                                      >
                                        <Copy size={12} />
                                      </button>
                                      <button
                                        onClick={() => deleteKeyResult(currentPeriod.id, obj.id, kr.id)}
                                        className="text-sage-deep hover:text-red-600 transition-colors"
                                        title="Delete task"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                </>)}
                              </SortableItem>
                            ))}
                          </ul>
                          </SortableList>
                        )}

                        {/* Objective actions: the common one, then a menu */}
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-sage-line">
                          <button
                            onClick={() => {
                              setAddTaskObjectiveId(obj.id)
                              setShowAddTaskModal(true)
                            }}
                            className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ink-faint hover:text-pink transition-colors"
                          >
                            <Plus size={12} />
                            Add task
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-ink-faint outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-pink/40" aria-label={`More for ${obj.title || 'this objective'}`}>
                              {savedToLibraryObjId === obj.id ? <><Check size={12} className="text-emerald-600" /> Saved</> : <><MoreHorizontal size={14} /> More</>}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onSelect={() => addBlankKeyResult(currentPeriod.id, obj.id)}>
                                <Plus size={14} className="mr-2 text-ink-faint" /> Add a blank task
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => duplicateObjective(currentPeriod.id, obj.id)}>
                                <Copy size={14} className="mr-2 text-ink-faint" /> Duplicate objective
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => saveObjectiveToLibrary(obj)}>
                                <BookmarkPlus size={14} className="mr-2 text-ink-faint" /> Save as a template
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => sendObjectiveToFuture(currentPeriod.id, obj.id)}>
                                <Undo2 size={14} className="mr-2 text-ink-faint" /> Move to future tasks
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => deleteObjective(currentPeriod.id, obj.id)} className="text-red-600 focus:text-red-700">
                                <Trash2 size={14} className="mr-2" /> Delete objective
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )}
                    </>)}
                  </SortableItem>
                )
              })}
              <AddTile
                label="Add objective"
                title="Add an objective from a template, from future tasks, or your own"
                onClick={() => setShowAddObjectiveModal(true)}
                className={currentPeriod.objectives.length ? 'min-h-[14rem]' : ''}
              />
            </div>
            </SortableList>
          )}
        </>
      )}

          </div>
        )}

      {/* ─── Modals ──────────────────────────────────────────── */}

      {showNewPeriodModal && (
        <NewPeriodModal
          periods={periods}
          futureObjectives={future.objectives}
          onAdd={addPeriod}
          onDuplicate={duplicatePeriod}
          onClose={() => setShowNewPeriodModal(false)}
        />
      )}

      {showAddObjectiveModal && currentPeriod && (
        <AddObjectiveModal
          onAdd={objective => addObjective(currentPeriod.id, objective)}
          futureObjectives={future.objectives}
          onAddFuture={(ids, keep) => addFutureObjectives(currentPeriod.id, ids, keep)}
          onClose={() => setShowAddObjectiveModal(false)}
        />
      )}

      {futureAdd && (
        <AddObjectiveModal
          forFuture
          presetCategory={futureAdd.category}
          onAdd={objective => { future.addObjective(objective); setFutureAdd(null) }}
          onClose={() => setFutureAdd(null)}
        />
      )}

      {futureAddTaskObjId && (
        <AddTaskModal
          onAdd={keyResult => {
            future.updateObjective(futureAddTaskObjId, o => ({ keyResults: [...o.keyResults, { internalNotes: '', ...keyResult }] }))
            setFutureAddTaskObjId(null)
          }}
          onClose={() => setFutureAddTaskObjId(null)}
        />
      )}

      {showAddTaskModal && currentPeriod && addTaskObjectiveId && (
        <AddTaskModal
          onAdd={keyResult => addKeyResult(currentPeriod.id, addTaskObjectiveId, keyResult)}
          onClose={() => {
            setShowAddTaskModal(false)
            setAddTaskObjectiveId(null)
          }}
        />
      )}

      {movedToFuture && (
        <UndoToast
          key={movedToFuture.futureId}
          message="Moved to future tasks"
          onUndo={undoSendToFuture}
          onDismiss={() => setMovedToFuture(null)}
        />
      )}

      {deletedObjective && (
        <UndoToast
          message="Objective deleted"
          onUndo={undoDeleteObjective}
          onDismiss={() => setDeletedObjective(null)}
        />
      )}

      <ClientEditModal
        client={client}
        isOpen={showEditClient}
        onClose={() => setShowEditClient(false)}
        onSaved={() => setShowEditClient(false)}
        onDeleted={() => navigate('/clients')}
        updateClient={updateClient}
        deleteClient={deleteClient}
      />

      {linkingObjectiveId && (
        <PageLinkPicker
          open
          onClose={() => setLinkingObjectiveId(null)}
          pages={sitemapPages}
          objectiveTitle={currentPeriod?.objectives.find(o => o.id === linkingObjectiveId)?.title}
          linkedIds={currentPeriod?.objectives.find(o => o.id === linkingObjectiveId)?.linkedPageIds || []}
          onSave={ids => updateObjective(currentPeriod.id, linkingObjectiveId, { linkedPageIds: ids })}
        />
      )}

      <ConfirmDialog
        open={!!confirmDeletePeriod}
        onClose={() => setConfirmDeletePeriod(null)}
        onConfirm={() => { if (confirmDeletePeriod) deletePeriod(confirmDeletePeriod.id) }}
        title={confirmDeletePeriod ? `Delete ${getPeriodLabel(confirmDeletePeriod.startMonth, confirmDeletePeriod.startYear, confirmDeletePeriod.endMonth, confirmDeletePeriod.endYear)}?` : ''}
        message={`This deletes the period with its ${confirmDeletePeriod?.objectives?.length || 0} objectives and all their tasks. It cannot be undone. Anything already pushed to Monday stays there.`}
        confirmLabel="Delete period"
      />

      <MondayPushModal
        open={showMondayPush}
        onClose={() => setShowMondayPush(false)}
        client={client}
        currentPeriod={currentPeriod}
        onPushed={periodId => setPushedPeriodIds(prev => new Set(prev).add(periodId))}
      />


    </div>
  )
}


// ─── Shared with client ────────────────────────────────────────

/** Whether a period shows in Client view. Off means the team is still working on it. */
function SharedSwitch({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      title={on ? 'This period shows in Client view. Click to take it back.' : 'Only the team sees this period. Click to show it in Client view.'}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-sage-line bg-white px-3 text-sm text-ink-soft transition-colors hover:border-ink"
    >
      <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-sage-deep'}`}>
        <span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${on ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
      </span>
      Shared with client
    </button>
  )
}

/** Month and year `n` months after the given one. */
function addMonths(month, year, n) {
  const index = year * 12 + (month - 1) + n
  return { month: (index % 12) + 1, year: Math.floor(index / 12) }
}

/** Default dates for a new period: the three months after the latest one, or from this month. */
function nextPeriodDates(periods) {
  const now = new Date()
  const latest = [...(periods || [])].sort((a, b) => (b.endYear * 12 + b.endMonth) - (a.endYear * 12 + a.endMonth))[0]
  const start = latest ? addMonths(latest.endMonth, latest.endYear, 1) : { month: now.getMonth() + 1, year: now.getFullYear() }
  const end = addMonths(start.month, start.year, 2)
  return { startMonth: start.month, startYear: start.year, endMonth: end.month, endYear: end.year }
}

// ─── New Period Modal ──────────────────────────────────────────

function NewPeriodModal({ periods, futureObjectives = [], onAdd, onDuplicate, onClose }) {
  const defaults = useMemo(() => nextPeriodDates(periods), [periods])
  const [startMonth, setStartMonth] = useState(defaults.startMonth)
  const [startYear, setStartYear] = useState(defaults.startYear)
  const [endMonth, setEndMonth] = useState(defaults.endMonth)
  const [endYear, setEndYear] = useState(defaults.endYear)
  const [goal, setGoal] = useState('')
  const [duplicateFrom, setDuplicateFrom] = useState('')
  const [selectedObjIds, setSelectedObjIds] = useState([])
  const [selectedFutureIds, setSelectedFutureIds] = useState([])
  const [keepFuture, setKeepFuture] = useState(false)

  const sourcePeriod = periods.find(p => p.id === duplicateFrom) || null

  // When a source period is chosen, default to carrying over all its objectives
  useEffect(() => {
    setSelectedObjIds(sourcePeriod ? sourcePeriod.objectives.map(o => o.id) : [])
  }, [duplicateFrom]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleObj = (id) => {
    setSelectedObjIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const pull = { ids: selectedFutureIds, keep: keepFuture }
    if (duplicateFrom) {
      onDuplicate(duplicateFrom, selectedObjIds, pull, { startMonth, startYear, endMonth, endYear, goal })
    } else {
      onAdd({
        id: generateId(),
        startMonth,
        startYear,
        endMonth,
        endYear,
        isPublished: false,
        goal,
        seoRetainer: null,
        offsiteAllowancePercent: DEFAULT_OFFSITE_ALLOWANCE,
        adHocPercent: DEFAULT_ADHOC_PERCENT,
        accountManagementPercent: DEFAULT_ACCOUNT_MANAGEMENT_PERCENT,
        objectives: [],
      }, pull)
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-medium text-ink">New period</h2>

        {periods.length > 0 && (
          <div>
            <label className="block text-sm text-ink-soft mb-1">Start from</label>
            <select
              value={duplicateFrom}
              onChange={e => setDuplicateFrom(e.target.value)}
              className="w-full h-9 px-3.5 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
            >
              <option value="">A blank period</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  A copy of {getPeriodLabel(p.startMonth, p.startYear, p.endMonth, p.endYear)}
                </option>
              ))}
            </select>
          </div>
        )}

        {duplicateFrom && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-ink-soft">Objectives to copy</label>
              {sourcePeriod && sourcePeriod.objectives.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedObjIds(
                    selectedObjIds.length === sourcePeriod.objectives.length
                      ? []
                      : sourcePeriod.objectives.map(o => o.id)
                  )}
                  className="text-xs font-medium text-pink hover:text-pink-dark"
                >
                  {selectedObjIds.length === sourcePeriod.objectives.length ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>
            {sourcePeriod && sourcePeriod.objectives.length > 0 ? (
              <div className="max-h-56 overflow-y-auto border border-sage-line rounded-xl divide-y divide-sage-line">
                {sourcePeriod.objectives.map(obj => {
                  const objHours = obj.keyResults.reduce((sum, kr) => sum + kr.amHours + kr.seoHours, 0)
                  const checked = selectedObjIds.includes(obj.id)
                  return (
                    <label
                      key={obj.id}
                      className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-sage-light"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleObj(obj.id)}
                        className="accent-pink"
                      />
                      <span className="flex-1 min-w-0 truncate text-ink">{obj.title || 'Untitled objective'}</span>
                      <span className="text-xs text-ink-faint shrink-0">{formatHours(objHours)}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-ink-faint px-1 py-2">This period has no objectives.</p>
            )}
          </div>
        )}

        {(
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-ink-soft mb-1">Start month</label>
                <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))} className="w-full h-9 px-3.5 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30">
                  {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-ink-soft mb-1">Start year</label>
                <input type="number" value={startYear} onChange={e => setStartYear(Number(e.target.value))} className="w-full h-9 px-3.5 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-ink-soft mb-1">End month</label>
                <select value={endMonth} onChange={e => setEndMonth(Number(e.target.value))} className="w-full h-9 px-3.5 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30">
                  {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-ink-soft mb-1">End year</label>
                <input type="number" value={endYear} onChange={e => setEndYear(Number(e.target.value))} className="w-full h-9 px-3.5 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-ink-soft mb-1">Goal</label>
              <input
                type="text"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder={sourcePeriod?.goal ? `Last period: ${sourcePeriod.goal}` : 'e.g. More enquiries from Google for custom homes'}
                className="w-full h-9 px-3.5 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
              />
            </div>
          </>
        )}

        <FutureTaskPicker
          objectives={futureObjectives}
          selectedIds={selectedFutureIds}
          onToggle={id => setSelectedFutureIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
          onSetAll={setSelectedFutureIds}
          keep={keepFuture}
          onKeepChange={setKeepFuture}
        />

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-9 px-4 text-sm text-ink-soft hover:text-ink">Cancel</button>
          <button type="submit" className="h-9 px-4 text-sm font-medium rounded-full bg-pink text-white hover:bg-pink-dark transition-colors">
            Create
          </button>
        </div>
      </form>
    </ModalBackdrop>
  )
}


// ─── Add Objective Modal ───────────────────────────────────────

// In a period, `futureObjectives` adds a Future tasks source beside the
// templates. `forFuture` adds to the Future tasks tab instead: the objective
// carries a category, `presetCategory` when opened from a section.
function AddObjectiveModal({ onAdd, onClose, futureObjectives, onAddFuture, forFuture = false, presetCategory = null }) {
  const [search, setSearch] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [source, setSource] = useState('templates')
  const [selectedFutureIds, setSelectedFutureIds] = useState([])
  const [keepFuture, setKeepFuture] = useState(false)

  const { allTemplatesResolved: templates, categories } = useTemplates()
  const [customCategory, setCustomCategory] = useState(presetCategory || '')
  // Task-type filter. Nothing selected means every type is shown. Opened
  // from a Future tasks section, it starts on that section's templates.
  const [activeTypes, setActiveTypes] = useState(() => new Set(presetCategory && categories.includes(presetCategory) ? [presetCategory] : []))
  const showFutureSource = !forFuture && Array.isArray(futureObjectives)
  const q = search.toLowerCase()
  const typeOptions = [...categories, ...(templates.some(t => !t.category) ? ['Uncategorised'] : [])]
  const filtered = templates.filter(t => {
    if (activeTypes.size && !activeTypes.has(t.category || 'Uncategorised')) return false
    return t.title.toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q)
  })

  function toggleType(cat) {
    setActiveTypes(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n })
  }

  // Group the filtered templates by category, in canonical category order
  // followed by any uncategorised templates.
  const grouped = (() => {
    const byCat = new Map()
    for (const t of filtered) {
      const key = t.category || 'Uncategorised'
      if (!byCat.has(key)) byCat.set(key, [])
      byCat.get(key).push(t)
    }
    const order = [...categories, 'Uncategorised']
    return order.filter(c => byCat.has(c)).map(c => [c, byCat.get(c)])
  })()

  const handleSelectTemplate = (template) => {
    const objective = buildObjectiveFromTemplate(template)
    onAdd(forFuture ? { ...objective, category: presetCategory || template.category || null } : objective)
  }

  const handleAddCustom = (e) => {
    e.preventDefault()
    if (!customTitle.trim()) return
    onAdd({
      id: generateId(),
      title: customTitle.trim(),
      scope: 'sitewide',
      scopeDetail: '',
      isActioned: true,
      notActionedReason: '',
      linkedPageIds: [],
      keyResults: [],
      ...(forFuture ? { category: customCategory || null } : {}),
    })
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <h2 className="text-xl font-medium text-ink mb-4">
        {forFuture ? `Add future objective${presetCategory ? ` to ${presetCategory}` : ''}` : 'Add objective'}
      </h2>

      {showFutureSource && !isCustom && (
        <Tabs value={source} onValueChange={setSource} className="mb-3">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="future">Future tasks ({futureObjectives.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {showFutureSource && !isCustom && source === 'future' ? (
        <div className="space-y-4">
          <FutureTaskPicker
            objectives={futureObjectives}
            selectedIds={selectedFutureIds}
            onToggle={id => setSelectedFutureIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
            onSetAll={setSelectedFutureIds}
            keep={keepFuture}
            onKeepChange={setKeepFuture}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 text-sm text-ink-soft hover:text-ink">Cancel</button>
            <button
              type="button"
              disabled={!selectedFutureIds.length}
              onClick={() => onAddFuture(selectedFutureIds, keepFuture)}
              className="h-9 px-4 text-sm font-medium rounded-full bg-pink text-white hover:bg-pink-dark disabled:opacity-40 transition-colors"
            >
              Add{selectedFutureIds.length > 1 ? ` ${selectedFutureIds.length}` : ''}
            </button>
          </div>
        </div>
      ) : isCustom ? (
        <form onSubmit={handleAddCustom} className="space-y-4">
          <div>
            <label className="block text-sm text-ink-soft mb-1">Objective title</label>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="Enter a custom objective title"
              autoFocus
              className="w-full h-9 px-3.5 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
            />
          </div>
          {forFuture && (
            <div>
              <label className="block text-sm text-ink-soft mb-1">Category</label>
              <select
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                className="w-full h-9 px-3.5 rounded-xl border border-sage-line bg-white text-sm text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
              >
                <option value="">{UNCATEGORISED}</option>
                {[...new Set([...TEMPLATE_CATEGORIES, ...categories, ...(presetCategory ? [presetCategory] : [])])].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setIsCustom(false)} className="text-sm text-ink-faint hover:text-ink-soft">
              ← Back to templates
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="h-9 px-4 text-sm text-ink-soft hover:text-ink">Cancel</button>
              <button type="submit" disabled={!customTitle.trim()} className="h-9 px-4 text-sm font-medium rounded-full bg-pink text-white hover:bg-pink-dark disabled:opacity-40 transition-colors">
                Add
              </button>
            </div>
          </div>
        </form>
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-deep" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              autoFocus
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
            />
          </div>

          {/* Task type pills — none active means every type */}
          {typeOptions.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {typeOptions.map(cat => {
                const on = activeTypes.has(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleType(cat)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      on
                        ? 'border-ink bg-ink text-white'
                        : 'border-sage-line bg-white text-ink-soft hover:border-ink'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
              {activeTypes.size > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTypes(new Set())}
                  className="rounded-full px-2.5 py-1 text-xs text-ink-faint hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Template List, grouped by category */}
          <div className="max-h-80 overflow-y-auto space-y-3 mb-3">
            {grouped.map(([category, tpls]) => (
              <div key={category} className="space-y-1">
                <p className="px-1 text-xs font-medium text-ink-soft">{category}</p>
                {tpls.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-sage-light transition-colors"
                  >
                    <p className="text-sm font-medium text-ink">{t.title}</p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      {t.taskCount} tasks · {formatHours(t.totalHours)} total
                    </p>
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-ink-faint text-center py-4">No templates match "{search}"</p>
            )}
          </div>

          {/* Custom option */}
          <div className="border-t border-sage-line pt-3 flex justify-between items-center">
            <button
              onClick={() => setIsCustom(true)}
              className="text-sm text-pink hover:text-pink-dark font-medium"
            >
              + Custom objective
            </button>
            <button onClick={onClose} className="h-9 px-4 text-sm text-ink-soft hover:text-ink">Cancel</button>
          </div>
        </>
      )}
    </ModalBackdrop>
  )
}


// ─── Add Task Modal ────────────────────────────────────────────

function AddTaskModal({ onAdd, onClose }) {
  const { tasks } = useTemplates()
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [description, setDescription] = useState('')
  const [amHours, setAmHours] = useState(0)
  const [seoHours, setSeoHours] = useState(0)

  const handleTaskSelect = (taskId) => {
    setSelectedTaskId(taskId)
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      setAmHours(task.defaultAmHours)
      setSeoHours(task.defaultSeoHours)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const task = tasks.find(t => t.id === selectedTaskId)
    if (!task) return
    onAdd({
      id: generateId(),
      task: task.name,
      description: description.trim(),
      amHours: roundToHalf(amHours),
      seoHours: roundToHalf(seoHours),
    })
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-medium text-ink">Add task</h2>

        <div>
          <label className="block text-sm text-ink-soft mb-1">Task type</label>
          <select
            value={selectedTaskId}
            onChange={e => handleTaskSelect(e.target.value)}
            className="w-full h-9 px-3.5 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
          >
            <option value="">Select a task type...</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({formatHours(t.defaultAmHours + t.defaultSeoHours)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-ink-soft mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add specific details for this task..."
            rows={2}
            className="w-full px-3.5 py-2 resize-none rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-ink-soft mb-1">AM hours</label>
            <input
              type="number"
              value={amHours}
              onChange={e => setAmHours(Number(e.target.value) || 0)}
              min={0}
              step={0.5}
              className="w-full h-9 px-3.5 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-soft mb-1">SEO hours</label>
            <input
              type="number"
              value={seoHours}
              onChange={e => setSeoHours(Number(e.target.value) || 0)}
              min={0}
              step={0.5}
              className="w-full h-9 px-3.5 rounded-xl border border-sage-line bg-white text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-9 px-4 text-sm text-ink-soft hover:text-ink">Cancel</button>
          <button
            type="submit"
            disabled={!selectedTaskId}
            className="h-9 px-4 text-sm font-medium rounded-full bg-pink text-white hover:bg-pink-dark disabled:opacity-40 transition-colors"
          >
            Add task
          </button>
        </div>
      </form>
    </ModalBackdrop>
  )
}


// ─── Modal Backdrop ────────────────────────────────────────────

function ModalBackdrop({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-lg shadow-ink/10 max-w-lg w-full mx-4 p-8 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-sage hover:text-ink transition-colors"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}
