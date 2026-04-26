import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Copy, ChevronDown, ChevronUp,
  Trash2, Globe, FileText, Hash, CheckCircle, XCircle,
  AlertTriangle, Search, X, ClipboardCheck, Loader2, Check, Circle, Pencil
} from 'lucide-react'
import { UndoToast } from '../../components/UndoToast'
import { ClientEditModal } from '../../components/ClientEditModal'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Badge } from '../../components/ui/badge'
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '../../components/ui/select'
import ClientView from './ClientView'
import { useClients } from '../../hooks'
import { useClientRetainers } from '../../hooks/useClientRetainers'
import { useOkrData } from '../../hooks/useOkrData'
import { TASK_LIBRARY, SCOPE_OPTIONS, getAllTemplatesResolved } from '../../lib/taskLibrary'
import {
  HOURLY_RATE, AD_HOC_BUFFER, DEFAULT_OFFSITE_ALLOWANCE,
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

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

function createBlankPeriod() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const endMonth = month + 2 > 12 ? (month + 2) - 12 : month + 2
  const endYear = month + 2 > 12 ? year + 1 : year
  return {
    id: generateId(),
    startMonth: month,
    startYear: year,
    endMonth,
    endYear,
    isPublished: false,
    goal: '',
    offsiteAllowancePercent: DEFAULT_OFFSITE_ALLOWANCE,
    adminTasks: {
      monthlyReportingAM: 1,
      monthlyReportingSEO: 2,
      okrReportingAM: 1,
      okrReportingSEO: 2,
    },
    objectives: [],
  }
}

// ─── Main Component ──────────────────────────────────────────────

export default function OkrPlanner() {
  const { clientId } = useParams()
  const { clients, updateClient, deleteClient } = useClients()
  const client = clients.find(c => c.id === clientId)

  // ─── Data from Supabase ──────────────────────────────────
  const {
    periods, setPeriods, loading, error, saving,
    savePeriod, setPublished, removePeriod, refetch,
  } = useOkrData(clientId)

  const { seoRetainer: clientSeoRetainer } = useClientRetainers(clientId)
  const abbreviation = client?.abbreviation || ''

  // ─── State ───────────────────────────────────────────────
  const [viewMode, setViewMode] = useState('internal')
  const [selectedPeriodId, setSelectedPeriodId] = useState(null)
  const [collapsedObjectives, setCollapsedObjectives] = useState({})
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  const [deletedObjective, setDeletedObjective] = useState(null)

  // Modal states
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false)
  const [showAddObjectiveModal, setShowAddObjectiveModal] = useState(false)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [addTaskObjectiveId, setAddTaskObjectiveId] = useState(null)
  const [showEditClient, setShowEditClient] = useState(false)

  const isClientView = viewMode === 'client'

  // Select first period when data loads
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(periods[0].id)
    }
  }, [periods, selectedPeriodId])

  // ─── Debounced Auto-Save + Unsaved Changes Tracking ─────
  const saveTimerRef = useRef(null)
  const savedTimerRef = useRef(null)
  const [saveError, setSaveError] = useState(null)
  // 'idle' | 'unsaved' | 'saved'
  const [saveStatus, setSaveStatus] = useState('idle')

  const hasUnsavedChanges = saveStatus === 'unsaved' || saving

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
                  : 'Failed to save. Your changes may not be persisted.'
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
            : 'Failed to save. Your changes may not be persisted.'
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

  // Filter periods for client view (published only)
  const visiblePeriods = isClientView
    ? periods.filter(p => p.isPublished)
    : periods

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
    const bufferHours = roundToHalf(baseHours * AD_HOC_BUFFER)

    const admin = currentPeriod.adminTasks
    const monthlyReportingTotal =
      (admin.monthlyReportingAM + admin.monthlyReportingSEO) * months
    const okrReportingTotal = admin.okrReportingAM + admin.okrReportingSEO
    const totalAdminHours = monthlyReportingTotal + okrReportingTotal

    const availableForObjectives = roundToHalf(baseHours - bufferHours - totalAdminHours)

    // Sum hours across all objectives
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

    const idealSeoHours = roundToHalf(availableForObjectives * SEO_HOUR_TARGET)
    const idealAmHours = roundToHalf(availableForObjectives * AM_HOUR_TARGET)

    return {
      retainerAmount, months, gross, offsiteDeduction, net, baseHours, bufferHours,
      monthlyReportingTotal, okrReportingTotal, totalAdminHours,
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

  const updateAdminTask = useCallback((periodId, field, value) => {
    setPeriods(prev => {
      const next = prev.map(p =>
        p.id === periodId
          ? { ...p, adminTasks: { ...p.adminTasks, [field]: Math.round(Number(value) || 0) } }
          : p
      )
      return next
    })
    triggerDebouncedSave(periodId)
  }, [setPeriods, triggerDebouncedSave])

  const addPeriod = useCallback((newPeriod) => {
    setPeriods(prev => [...prev, newPeriod])
    setSelectedPeriodId(newPeriod.id)
    setShowNewPeriodModal(false)
    savePeriod(newPeriod).catch(err => console.error('Failed to save new period:', err))
  }, [setPeriods, savePeriod])

  const duplicatePeriod = useCallback((sourcePeriodId) => {
    const source = periods.find(p => p.id === sourcePeriodId)
    if (!source) return
    const newPeriod = {
      ...source,
      id: generateId(),
      isPublished: false,
      objectives: source.objectives.map(obj => ({
        ...obj,
        id: generateId(),
        keyResults: obj.keyResults.map(kr => ({
          ...kr,
          id: generateId(),

        })),
      })),
    }
    setPeriods(prev => [...prev, newPeriod])
    setSelectedPeriodId(newPeriod.id)
    setShowNewPeriodModal(false)
    savePeriod(newPeriod).catch(err => console.error('Failed to save duplicated period:', err))
  }, [periods, setPeriods, savePeriod])

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

  // ─── Clipboard Export ────────────────────────────────────

  const copyToClipboard = useCallback(() => {
    if (!currentPeriod) return
    const lines = []
    for (const obj of currentPeriod.objectives) {
      const scopeLabel = SCOPE_OPTIONS.find(s => s.id === obj.scope)?.label
      const detail = (obj.scopeDetail || '').trim()
      const objSegment = detail && scopeLabel
        ? `${obj.title} — ${scopeLabel}: ${detail}`
        : obj.title
      const total = obj.keyResults.length
      obj.keyResults.forEach((kr, i) => {
        lines.push(`${abbreviation} | ${kr.task}${kr.description ? ' — ' + kr.description : ''} | ${objSegment} | ${i + 1} of ${total}`)
      })
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 2000)
    })
  }, [currentPeriod, abbreviation])

  // ─── Guard: client not found ─────────────────────────────

  if (!client) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Client not found.</p>
        <Link to="/okr" className="text-coral hover:text-coral-dark mt-2 inline-block">
          ← Back to OKR Planner
        </Link>
      </div>
    )
  }

  // ─── Guard: loading ────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/okr" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-semibold text-charcoal">{client.name}</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-coral" />
          <span className="ml-2 text-gray-500">Loading OKR data...</span>
        </div>
      </div>
    )
  }

  // ─── Guard: error ──────────────────────────────────────

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/okr" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-semibold text-charcoal">{client.name}</h1>
        </div>
        <div className="text-center py-20">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="text-coral hover:text-coral-dark font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // When switching to client view and current period is unpublished, select first published
  if (isClientView && currentPeriod && !currentPeriod.isPublished) {
    const firstPublished = periods.find(p => p.isPublished)
    if (firstPublished && firstPublished.id !== selectedPeriodId) {
      setSelectedPeriodId(firstPublished.id)
    }
  }

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className={isClientView ? '' : 'max-w-7xl mx-auto'}>

      {/* Save Error Banner — sticky until dismissed or retried */}
      {saveError && (
        <div className={`mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 ${isClientView ? 'max-w-7xl mx-auto' : ''}`}>
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{saveError}</p>
          <button
            onClick={retrySave}
            className="text-xs font-medium text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2.5 py-1 rounded transition-colors shrink-0"
          >
            Retry
          </button>
          <button
            onClick={() => setSaveError(null)}
            className="text-red-400 hover:text-red-600 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${isClientView ? 'max-w-7xl mx-auto px-4' : ''}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => guardedNavigate('/okr')} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-charcoal flex items-center gap-2">
              {client.name}
              <button
                onClick={() => setShowEditClient(true)}
                className="text-gray-300 hover:text-gray-500 transition-colors"
                title="Edit client"
              >
                <Pencil size={16} />
              </button>
              {saving ? (
                <span className="ml-3 text-xs font-normal text-gray-400 inline-flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  Saving...
                </span>
              ) : saveError ? (
                <span className="ml-3 text-xs font-normal text-red-500 inline-flex items-center gap-1">
                  <Circle size={8} fill="currentColor" />
                  Save failed
                </span>
              ) : saveStatus === 'unsaved' ? (
                <span className="ml-3 text-xs font-normal text-amber-500 inline-flex items-center gap-1">
                  <Circle size={8} fill="currentColor" />
                  Unsaved changes
                </span>
              ) : saveStatus === 'saved' ? (
                <span className="ml-3 text-xs font-normal text-green-500 inline-flex items-center gap-1">
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
            <TabsList className="bg-gray-100">
              <TabsTrigger
                value="internal"
                className="data-[state=active]:bg-charcoal data-[state=active]:text-white"
              >
                Internal
              </TabsTrigger>
              <TabsTrigger
                value="client"
                className="data-[state=active]:bg-charcoal data-[state=active]:text-white"
              >
                Client View
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Action Buttons (internal only) */}
          {!isClientView && currentPeriod && (
            <>
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {copiedToClipboard ? (
                  <>
                    <ClipboardCheck size={16} className="text-green-500" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy to Monday
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  const newVal = !currentPeriod.isPublished
                  setPeriods(prev => prev.map(p =>
                    p.id === currentPeriod.id ? { ...p, isPublished: newVal } : p
                  ))
                  setPublished(currentPeriod.id, newVal).catch(err => {
                    console.error('Failed to toggle publish:', err)
                    setPeriods(prev => prev.map(p =>
                      p.id === currentPeriod.id ? { ...p, isPublished: !newVal } : p
                    ))
                  })
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  currentPeriod.isPublished
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {currentPeriod.isPublished ? 'Published' : 'Draft'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Client View ────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isClientView ? (
          <motion.div
            key="client"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {currentPeriod ? (
              <ClientView
                clientName={client.name}
                goal={currentPeriod.goal}
                objectives={currentPeriod.objectives}
                periods={visiblePeriods}
                selectedPeriodId={selectedPeriodId}
                onPeriodChange={setSelectedPeriodId}
              />
            ) : (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm max-w-lg mx-auto">
                <h3 className="text-lg font-semibold text-charcoal mb-2">No published periods yet</h3>
                <p className="text-gray-500 text-sm">
                  Switch to Internal View to create and publish a period.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="internal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >

      {/* Over-allocation Warning */}
      {calc && calc.remainingHours < 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3"
        >
          <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Over-allocated by {formatHours(Math.abs(calc.remainingHours))}
            </p>
            <p className="text-sm text-red-600 mt-0.5">
              Reduce task hours or increase the retainer to bring this back into balance.
            </p>
          </div>
        </motion.div>
      )}

      {/* Client Settings */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Abbreviation</span>
          <span className="text-sm font-semibold text-charcoal uppercase">{abbreviation || '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">SEO Retainer</span>
          {currentPeriod ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="100"
                value={currentPeriod.seoRetainer ?? clientSeoRetainer}
                onChange={e => updatePeriod(currentPeriod.id, { seoRetainer: Number(e.target.value) || 0 })}
                className="w-24 px-2 py-0.5 text-sm font-semibold text-charcoal border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-coral/40"
              />
              {currentPeriod.seoRetainer != null && currentPeriod.seoRetainer !== clientSeoRetainer && (
                <span className="text-xs text-gray-400">(client default: {formatCurrency(clientSeoRetainer)})</span>
              )}
            </div>
          ) : (
            <span className="text-sm font-semibold text-charcoal">{formatCurrency(clientSeoRetainer)}</span>
          )}
        </div>
      </div>

      {/* Period Selector — only show dropdown when periods exist */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {visiblePeriods.length > 0 && (
          <Select value={selectedPeriodId || ''} onValueChange={setSelectedPeriodId}>
            <SelectTrigger className="w-auto min-w-[200px]">
              <SelectValue placeholder="Select a period" />
            </SelectTrigger>
            <SelectContent>
              {visiblePeriods.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {getPeriodLabel(p.startMonth, p.startYear, p.endMonth, p.endYear)}
                  {!p.isPublished ? ' (Draft)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <button
          onClick={() => setShowNewPeriodModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-coral text-white hover:bg-coral-dark transition-colors"
        >
          <Plus size={16} />
          New Period
        </button>
        {currentPeriod && (
          <button
            onClick={() => deletePeriod(currentPeriod.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
        )}
      </div>

      {/* No period state */}
      {!currentPeriod && (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus size={24} className="text-coral" />
          </div>
          <h3 className="text-lg font-semibold text-charcoal mb-2">No periods yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Create your first OKR period to start planning objectives and allocating retainer hours.
          </p>
          <button
            onClick={() => setShowNewPeriodModal(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-lg bg-coral text-white hover:bg-coral-dark transition-colors"
          >
            <Plus size={16} />
            New Period
          </button>
        </div>
      )}

      {/* Period Content */}
      {currentPeriod && (
        <>
          {/* Period Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Start</label>
                <select
                  value={currentPeriod.startMonth}
                  onChange={e => updatePeriod(currentPeriod.id, { startMonth: Number(e.target.value) })}
                  className="px-2 py-1 text-sm border border-gray-200 rounded-lg"
                >
                  {MONTH_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={currentPeriod.startYear}
                  onChange={e => updatePeriod(currentPeriod.id, { startYear: Number(e.target.value) })}
                  className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">End</label>
                <select
                  value={currentPeriod.endMonth}
                  onChange={e => updatePeriod(currentPeriod.id, { endMonth: Number(e.target.value) })}
                  className="px-2 py-1 text-sm border border-gray-200 rounded-lg"
                >
                  {MONTH_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={currentPeriod.endYear}
                  onChange={e => updatePeriod(currentPeriod.id, { endYear: Number(e.target.value) })}
                  className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Offsite %</label>
                <input
                  type="number"
                  value={currentPeriod.offsiteAllowancePercent}
                  onChange={e => updatePeriod(currentPeriod.id, { offsiteAllowancePercent: Number(e.target.value) || 0 })}
                  min={0}
                  max={100}
                  className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Goal</label>
              <input
                type="text"
                value={currentPeriod.goal}
                onChange={e => updatePeriod(currentPeriod.id, { goal: e.target.value })}
                placeholder="e.g. Increase organic traffic by 30%"
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral/30"
              />
            </div>
          </div>

          {/* Hour Allocation Breakdown */}
          {calc && (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              {/* Retainer Calculation */}
              <motion.div variants={fadeUp} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Retainer</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{formatCurrency(calc.retainerAmount)}/mo × {calc.months} mo</span>
                    <span className="font-medium">{formatCurrency(calc.gross)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Offsite ({currentPeriod.offsiteAllowancePercent}%)</span>
                    <span>−{formatCurrency(calc.offsiteDeduction)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-1.5">
                    <span className="text-gray-500">Net retainer</span>
                    <span className="font-medium">{formatCurrency(calc.net)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">÷ ${HOURLY_RATE}/hr</span>
                    <span className="font-semibold text-charcoal">{formatHours(calc.baseHours)}</span>
                  </div>
                </div>
              </motion.div>

              {/* Ad Hoc Buffer */}
              <motion.div variants={fadeUp} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ad Hoc Buffer</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">10% of {formatHours(calc.baseHours)}</span>
                    <span className="font-semibold text-charcoal">{formatHours(calc.bufferHours)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Reserved for unplanned requests and ad hoc tasks.
                  </p>
                </div>
              </motion.div>

              {/* Admin Tasks */}
              <motion.div variants={fadeUp} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Admin Tasks</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Monthly Reporting (per month)</p>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">AM</span>
                        <input
                          type="number"
                          value={currentPeriod.adminTasks.monthlyReportingAM}
                          onChange={e => updateAdminTask(currentPeriod.id, 'monthlyReportingAM', e.target.value)}
                          min={0}
                          step={1}
                          className="w-14 px-1.5 py-0.5 text-sm border border-gray-200 rounded text-center"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">SEO</span>
                        <input
                          type="number"
                          value={currentPeriod.adminTasks.monthlyReportingSEO}
                          onChange={e => updateAdminTask(currentPeriod.id, 'monthlyReportingSEO', e.target.value)}
                          min={0}
                          step={1}
                          className="w-14 px-1.5 py-0.5 text-sm border border-gray-200 rounded text-center"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      × {calc.months} months = {formatHours(calc.monthlyReportingTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">OKR Reporting (per period)</p>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">AM</span>
                        <input
                          type="number"
                          value={currentPeriod.adminTasks.okrReportingAM}
                          onChange={e => updateAdminTask(currentPeriod.id, 'okrReportingAM', e.target.value)}
                          min={0}
                          step={1}
                          className="w-14 px-1.5 py-0.5 text-sm border border-gray-200 rounded text-center"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">SEO</span>
                        <input
                          type="number"
                          value={currentPeriod.adminTasks.okrReportingSEO}
                          onChange={e => updateAdminTask(currentPeriod.id, 'okrReportingSEO', e.target.value)}
                          min={0}
                          step={1}
                          className="w-14 px-1.5 py-0.5 text-sm border border-gray-200 rounded text-center"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">= {formatHours(calc.okrReportingTotal)}</p>
                  </div>
                  <div className="border-t border-gray-100 pt-1.5 flex justify-between">
                    <span className="text-gray-500">Total admin</span>
                    <span className="font-medium">{formatHours(calc.totalAdminHours)}</span>
                  </div>
                </div>
              </motion.div>

              {/* Available for Objectives */}
              <motion.div variants={fadeUp} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Available</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Base hours</span>
                    <span>{formatHours(calc.baseHours)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Buffer</span>
                    <span>−{formatHours(calc.bufferHours)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Admin</span>
                    <span>−{formatHours(calc.totalAdminHours)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-1.5">
                    <span className="font-medium text-charcoal">For objectives</span>
                    <span className="font-semibold text-charcoal">{formatHours(calc.availableForObjectives)}</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* AM/SEO Split */}
          {calc && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6"
            >
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AM / SEO Split</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">SEO Hours</p>
                  <p className="font-semibold text-charcoal">{formatHours(calc.totalSeoHours)}</p>
                  <p className="text-xs text-gray-400">Ideal: {formatHours(calc.idealSeoHours)} (60%)</p>
                </div>
                <div>
                  <p className="text-gray-500">AM Hours</p>
                  <p className="font-semibold text-charcoal">{formatHours(calc.totalAmHours)}</p>
                  <p className="text-xs text-gray-400">Ideal: {formatHours(calc.idealAmHours)} (40%)</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Allocated</p>
                  <p className="font-semibold text-charcoal">{formatHours(calc.totalObjectiveHours)}</p>
                  <p className="text-xs text-gray-400">of {formatHours(calc.availableForObjectives)} available</p>
                </div>
                <div>
                  <p className="text-gray-500">Remaining</p>
                  <p className={`font-semibold ${calc.remainingHours < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatHours(calc.remainingHours)}
                  </p>
                  <p className="text-xs text-gray-400">to allocate</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Objectives */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-charcoal">Objectives</h2>
            <button
              onClick={() => setShowAddObjectiveModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-coral text-white hover:bg-coral-dark transition-colors"
            >
              <Plus size={16} />
              Add Objective
            </button>
          </div>

          {currentPeriod.objectives.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
              <p className="text-gray-400">No objectives yet. Add one to get started.</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              {currentPeriod.objectives.map(obj => {
                const ScopeIcon = SCOPE_ICONS[obj.scope] || Globe
                const scopeOption = SCOPE_OPTIONS.find(s => s.id === obj.scope)
                const isCollapsed = collapsedObjectives[obj.id]
                const objTotalHours = obj.keyResults.reduce(
                  (sum, kr) => sum + kr.amHours + kr.seoHours, 0
                )

                return (
                  <motion.div
                    key={obj.id}
                    variants={fadeUp}
                    className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 ${
                      obj.isActioned === false ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Objective Header */}
                    <div className="p-4 border-b border-gray-50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={obj.title}
                            onChange={e => updateObjective(currentPeriod.id, obj.id, { title: e.target.value })}
                            className="w-full font-semibold text-charcoal bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                          />
                          <div className="flex items-center gap-2 mt-1.5">
                            <select
                              value={obj.scope}
                              onChange={e => updateObjective(currentPeriod.id, obj.id, { scope: e.target.value })}
                              className={`text-xs px-2 py-0.5 rounded-full ${scopeOption?.color || 'bg-gray-100 text-gray-600'}`}
                            >
                              {SCOPE_OPTIONS.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>
                            <span className="text-xs text-gray-400">{formatHours(objTotalHours)}</span>
                          </div>
                          {/* Scope detail */}
                          {(obj.scope === 'specific-pages' || obj.scope === 'keyword-group') && (
                            <div className="mt-2">
                              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                                {obj.scope === 'specific-pages' ? 'Pages / Clusters' : 'Keyword Group'}
                              </label>
                              <input
                                type="text"
                                value={obj.scopeDetail || ''}
                                onChange={e => updateObjective(currentPeriod.id, obj.id, { scopeDetail: e.target.value })}
                                placeholder={obj.scope === 'specific-pages' ? 'e.g. homepage, product pages...' : 'e.g. branded keywords...'}
                                className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-coral/30 placeholder:text-gray-300"
                              />
                            </div>
                          )}
                          {/* Actioned toggle */}
                          <button
                            onClick={() => updateObjective(currentPeriod.id, obj.id, {
                              isActioned: !obj.isActioned,
                              notActionedReason: !obj.isActioned ? '' : obj.notActionedReason,
                            })}
                            className={`mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                              obj.isActioned !== false
                                ? 'bg-green-50 text-green-600'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {obj.isActioned !== false
                              ? <><CheckCircle size={12} /> Actioned</>
                              : <><XCircle size={12} /> Not Actioned</>
                            }
                          </button>
                          {obj.isActioned === false && (
                            <input
                              type="text"
                              value={obj.notActionedReason || ''}
                              onChange={e => updateObjective(currentPeriod.id, obj.id, { notActionedReason: e.target.value })}
                              placeholder="Reason not actioned..."
                              className="w-full text-xs text-gray-500 mt-1.5 bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-coral/30 placeholder:text-gray-300"
                            />
                          )}
                        </div>
                        <button
                          onClick={() => toggleCollapse(obj.id)}
                          className="text-gray-300 hover:text-gray-500 p-0.5"
                        >
                          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Key Results */}
                    {!isCollapsed && (
                      <div className="p-4">
                        {obj.keyResults.length === 0 ? (
                          <p className="text-sm text-gray-300 py-2">No tasks yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {obj.keyResults.map((kr, krIndex) => (
                              <li key={kr.id} className="group flex items-start gap-2">
                                <span className="shrink-0 text-xs font-medium text-gray-400 w-7 text-center leading-5 mt-1">
                                  {krIndex + 1}/{obj.keyResults.length}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <input
                                    type="text"
                                    value={kr.task}
                                    onChange={e => updateKeyResult(
                                      currentPeriod.id, obj.id, kr.id,
                                      { task: e.target.value }
                                    )}
                                    className="w-full text-sm text-charcoal bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                                  />
                                  <input
                                    type="text"
                                    value={kr.description}
                                    onChange={e => updateKeyResult(
                                      currentPeriod.id, obj.id, kr.id,
                                      { description: e.target.value }
                                    )}
                                    placeholder="Add details..."
                                    className="w-full text-xs text-gray-400 mt-0.5 bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-gray-300"
                                  />
                                  <textarea
                                    value={kr.internalNotes}
                                    onChange={e => updateKeyResult(
                                      currentPeriod.id, obj.id, kr.id,
                                      { internalNotes: e.target.value }
                                    )}
                                    placeholder="Internal notes (not visible to client)..."
                                    rows={2}
                                    className="w-full mt-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-amber-300 placeholder:text-amber-300"
                                  />
                                  <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-400">AM</span>
                                      <input
                                        type="number"
                                        value={kr.amHours}
                                        onChange={e => updateKeyResult(
                                          currentPeriod.id, obj.id, kr.id,
                                          { amHours: roundToHalf(Number(e.target.value) || 0) }
                                        )}
                                        min={0}
                                        step={0.5}
                                        className="w-14 px-1.5 py-0.5 text-xs border border-gray-200 rounded text-center"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-400">SEO</span>
                                      <input
                                        type="number"
                                        value={kr.seoHours}
                                        onChange={e => updateKeyResult(
                                          currentPeriod.id, obj.id, kr.id,
                                          { seoHours: roundToHalf(Number(e.target.value) || 0) }
                                        )}
                                        min={0}
                                        step={0.5}
                                        className="w-14 px-1.5 py-0.5 text-xs border border-gray-200 rounded text-center"
                                      />
                                    </div>
                                    <span className="text-xs text-gray-400">{formatHours(kr.amHours + kr.seoHours)}</span>
                                    <button
                                      onClick={() => duplicateKeyResult(currentPeriod.id, obj.id, kr.id)}
                                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-coral transition-all ml-auto"
                                      title="Duplicate key result"
                                    >
                                      <Copy size={12} />
                                    </button>
                                    <button
                                      onClick={() => deleteKeyResult(currentPeriod.id, obj.id, kr.id)}
                                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Objective actions */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                          <button
                            onClick={() => {
                              setAddTaskObjectiveId(obj.id)
                              setShowAddTaskModal(true)
                            }}
                            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-coral transition-colors"
                          >
                            <Plus size={12} />
                            Add Task
                          </button>
                          <button
                            onClick={() => duplicateObjective(currentPeriod.id, obj.id)}
                            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-coral transition-colors"
                          >
                            <Copy size={12} />
                            Duplicate
                          </button>
                          <button
                            onClick={() => deleteObjective(currentPeriod.id, obj.id)}
                            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors ml-auto"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </>
      )}

          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modals ──────────────────────────────────────────── */}

      {showNewPeriodModal && (
        <NewPeriodModal
          periods={periods}
          onAdd={addPeriod}
          onDuplicate={duplicatePeriod}
          onClose={() => setShowNewPeriodModal(false)}
        />
      )}

      {showAddObjectiveModal && currentPeriod && (
        <AddObjectiveModal
          onAdd={objective => addObjective(currentPeriod.id, objective)}
          onClose={() => setShowAddObjectiveModal(false)}
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
        onDeleted={() => navigate('/okr')}
        updateClient={updateClient}
        deleteClient={deleteClient}
      />

    </div>
  )
}


// ─── New Period Modal ──────────────────────────────────────────

function NewPeriodModal({ periods, onAdd, onDuplicate, onClose }) {
  const now = new Date()
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1)
  const [startYear, setStartYear] = useState(now.getFullYear())
  const [endMonth, setEndMonth] = useState(Math.min(now.getMonth() + 3, 12))
  const [endYear, setEndYear] = useState(now.getFullYear())
  const [goal, setGoal] = useState('')
  const [duplicateFrom, setDuplicateFrom] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (duplicateFrom) {
      onDuplicate(duplicateFrom)
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
        adminTasks: {
          monthlyReportingAM: 1,
          monthlyReportingSEO: 2,
          okrReportingAM: 1,
          okrReportingSEO: 2,
        },
        objectives: [],
      })
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold text-charcoal">New Period</h2>

        {periods.length > 0 && (
          <div>
            <label className="block text-sm text-gray-500 mb-1">Duplicate from</label>
            <select
              value={duplicateFrom}
              onChange={e => setDuplicateFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            >
              <option value="">Blank period</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {getPeriodLabel(p.startMonth, p.startYear, p.endMonth, p.endYear)}
                </option>
              ))}
            </select>
          </div>
        )}

        {!duplicateFrom && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Start Month</label>
                <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                  {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Start Year</label>
                <input type="number" value={startYear} onChange={e => setStartYear(Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">End Month</label>
                <select value={endMonth} onChange={e => setEndMonth(Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                  {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">End Year</label>
                <input type="number" value={endYear} onChange={e => setEndYear(Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Goal</label>
              <input
                type="text"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="e.g. Increase organic traffic by 30%"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-coral text-white hover:bg-coral-dark transition-colors">
            {duplicateFrom ? 'Duplicate' : 'Create'}
          </button>
        </div>
      </form>
    </ModalBackdrop>
  )
}


// ─── Add Objective Modal ───────────────────────────────────────

function AddObjectiveModal({ onAdd, onClose }) {
  const [search, setSearch] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [customTitle, setCustomTitle] = useState('')

  const templates = useMemo(() => getAllTemplatesResolved(), [])
  const filtered = templates.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectTemplate = (template) => {
    const objective = {
      id: generateId(),
      title: template.title,
      scope: template.defaultScope,
      scopeDetail: '',
      keyResults: template.resolvedTasks.map(task => ({
        id: generateId(),
        task: task.name,
        description: '',
        amHours: task.defaultAmHours,
        seoHours: task.defaultSeoHours,
      })),
      isActioned: true,
      notActionedReason: '',
    }
    onAdd(objective)
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
      keyResults: [],
    })
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <h2 className="text-lg font-semibold text-charcoal mb-4">Add Objective</h2>

      {isCustom ? (
        <form onSubmit={handleAddCustom} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Objective Title</label>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="Enter a custom objective title"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral/30"
            />
          </div>
          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setIsCustom(false)} className="text-sm text-gray-400 hover:text-gray-600">
              ← Back to templates
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              <button type="submit" disabled={!customTitle.trim()} className="px-4 py-2 text-sm font-medium rounded-lg bg-coral text-white hover:bg-coral-dark disabled:opacity-40 transition-colors">
                Add
              </button>
            </div>
          </div>
        </form>
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              autoFocus
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral/30"
            />
          </div>

          {/* Template List */}
          <div className="max-h-80 overflow-y-auto space-y-1 mb-3">
            {filtered.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelectTemplate(t)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium text-charcoal">{t.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.taskCount} tasks · {formatHours(t.totalHours)} total
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No templates match "{search}"</p>
            )}
          </div>

          {/* Custom option */}
          <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
            <button
              onClick={() => setIsCustom(true)}
              className="text-sm text-coral hover:text-coral-dark font-medium"
            >
              + Custom Objective
            </button>
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </>
      )}
    </ModalBackdrop>
  )
}


// ─── Add Task Modal ────────────────────────────────────────────

function AddTaskModal({ onAdd, onClose }) {
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [description, setDescription] = useState('')
  const [amHours, setAmHours] = useState(0)
  const [seoHours, setSeoHours] = useState(0)

  const handleTaskSelect = (taskId) => {
    setSelectedTaskId(taskId)
    const task = TASK_LIBRARY.find(t => t.id === taskId)
    if (task) {
      setAmHours(task.defaultAmHours)
      setSeoHours(task.defaultSeoHours)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const task = TASK_LIBRARY.find(t => t.id === selectedTaskId)
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
        <h2 className="text-lg font-semibold text-charcoal">Add Task</h2>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Task Type</label>
          <select
            value={selectedTaskId}
            onChange={e => handleTaskSelect(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral/30"
          >
            <option value="">Select a task type...</option>
            {TASK_LIBRARY.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({formatHours(t.defaultAmHours + t.defaultSeoHours)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add specific details for this task..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-coral/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1">AM Hours</label>
            <input
              type="number"
              value={amHours}
              onChange={e => setAmHours(Number(e.target.value) || 0)}
              min={0}
              step={0.5}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">SEO Hours</label>
            <input
              type="number"
              value={seoHours}
              onChange={e => setSeoHours(Number(e.target.value) || 0)}
              min={0}
              step={0.5}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <button
            type="submit"
            disabled={!selectedTaskId}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-coral text-white hover:bg-coral-dark disabled:opacity-40 transition-colors"
          >
            Add Task
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}
