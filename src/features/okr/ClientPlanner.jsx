import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  Check,
} from 'lucide-react'
import { Badge, Button, Modal, EmptyState } from '../../components'
import { useOkr } from './OkrContext'
import {
  HOURLY_RATE,
  AM_HOUR_TARGET,
  SEO_HOUR_TARGET,
  AD_HOC_BUFFER,
} from '../../lib/constants'
import PeriodForm from './PeriodForm'
import ObjectiveForm from './ObjectiveForm'
import TaskForm from './TaskForm'
import { exportToMondayCsv } from './mondayExport'

export default function ClientPlanner() {
  const { clientId } = useParams()
  const { state, dispatch } = useOkr()

  const client = state.clients.find((c) => c.id === clientId)
  const periods = state.periods.filter((p) => p.client_id === clientId)
  const [selectedPeriodId, setSelectedPeriodId] = useState(null)

  const period = selectedPeriodId
    ? periods.find((p) => p.id === selectedPeriodId)
    : periods[periods.length - 1]
  const objectives = state.objectives.filter((o) => o.period_id === period?.id)

  // Modal states
  const [showPeriodForm, setShowPeriodForm] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState(null)
  const [showObjectiveForm, setShowObjectiveForm] = useState(false)
  const [editingObjective, setEditingObjective] = useState(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [activeObjectiveId, setActiveObjectiveId] = useState(null)

  if (!client) {
    return (
      <div className="max-w-5xl">
        <p className="text-gray-500">Client not found.</p>
        <Link
          to="/okr"
          className="text-coral hover:text-coral-dark text-sm mt-2 inline-block"
        >
          &larr; Back to OKR Planner
        </Link>
      </div>
    )
  }

  const monthlyHours = Math.round(client.monthly_retainer / HOURLY_RATE)
  const quarterlyHours = monthlyHours * 3
  const bufferHours = Math.round(quarterlyHours * AD_HOC_BUFFER)
  const allocatableHours = quarterlyHours - bufferHours

  const totalAmHours = objectives.reduce(
    (sum, obj) => sum + obj.tasks.reduce((s, t) => s + t.am_hours, 0),
    0
  )
  const totalSeoHours = objectives.reduce(
    (sum, obj) => sum + obj.tasks.reduce((s, t) => s + t.seo_hours, 0),
    0
  )
  const totalHours = totalAmHours + totalSeoHours
  const amPercent = totalHours > 0 ? Math.round((totalAmHours / totalHours) * 100) : 0
  const seoPercent = totalHours > 0 ? Math.round((totalSeoHours / totalHours) * 100) : 0

  function handleSavePeriod(data) {
    if (editingPeriod) {
      dispatch({ type: 'UPDATE_PERIOD', payload: { ...data, id: editingPeriod.id } })
    } else {
      dispatch({ type: 'ADD_PERIOD', payload: data })
    }
    setShowPeriodForm(false)
    setEditingPeriod(null)
  }

  function handleTogglePublished() {
    if (!period) return
    dispatch({ type: 'TOGGLE_PUBLISHED', payload: period.id })
  }

  function handleSaveObjective(data) {
    if (editingObjective) {
      dispatch({
        type: 'UPDATE_OBJECTIVE',
        payload: { ...data, id: editingObjective.id },
      })
    } else {
      dispatch({
        type: 'ADD_OBJECTIVE',
        payload: { ...data, period_id: period.id },
      })
    }
    setShowObjectiveForm(false)
    setEditingObjective(null)
  }

  function handleDeleteObjective(objId) {
    dispatch({ type: 'DELETE_OBJECTIVE', payload: objId })
  }

  function handleSaveTask(data) {
    if (editingTask) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          objectiveId: activeObjectiveId,
          taskId: editingTask.id,
          updates: data,
        },
      })
    } else {
      dispatch({
        type: 'ADD_TASK',
        payload: { objectiveId: activeObjectiveId, task: data },
      })
    }
    setShowTaskForm(false)
    setEditingTask(null)
    setActiveObjectiveId(null)
  }

  function handleDeleteTask(objectiveId, taskId) {
    dispatch({
      type: 'DELETE_TASK',
      payload: { objectiveId, taskId },
    })
  }

  function handleCycleStatus(objectiveId, taskId) {
    dispatch({
      type: 'CYCLE_TASK_STATUS',
      payload: { objectiveId, taskId },
    })
  }

  return (
    <div className="max-w-5xl">
      <Link
        to="/okr"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-coral mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to OKR Planner
      </Link>

      {/* Client Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-charcoal">{client.name}</h1>
            {period && (
              <Badge variant={period.is_published ? 'success' : 'coral'}>
                {period.is_published ? 'Published' : 'Draft'}
              </Badge>
            )}
          </div>
          {period && (
            <p className="text-gray-500">
              {period.label} &middot; {period.goal}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {period && (
            <>
              <Link
                to={`/okr/${clientId}/view${period ? `?period=${period.id}` : ''}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Eye className="w-3.5 h-3.5" />
                Client View
              </Link>
              <button
                onClick={() => exportToMondayCsv(client, period, objectives)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                onClick={handleTogglePublished}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Check className="w-3.5 h-3.5" />
                {period.is_published ? 'Unpublish' : 'Publish'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Period Selector */}
      {periods.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriodId(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                p.id === period?.id
                  ? 'bg-coral text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => {
              setEditingPeriod(null)
              setShowPeriodForm(true)
            }}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-400 border border-dashed border-gray-300 hover:border-coral hover:text-coral transition-colors"
          >
            <Plus className="w-3.5 h-3.5 inline" /> New Quarter
          </button>
          {period && (
            <button
              onClick={() => {
                setEditingPeriod(period)
                setShowPeriodForm(true)
              }}
              className="ml-auto text-gray-400 hover:text-gray-600"
              title="Edit period"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {!period ? (
        <EmptyState
          title="No quarters planned yet"
          description="Create your first quarter plan to start allocating hours."
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditingPeriod(null)
                setShowPeriodForm(true)
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Create Quarter Plan
            </Button>
          }
        />
      ) : (
        <>
          {/* Hour Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            <SummaryCard
              label="Monthly Retainer"
              value={`$${client.monthly_retainer.toLocaleString()}`}
            />
            <SummaryCard label="Quarterly Hours" value={`${quarterlyHours} hrs`} />
            <SummaryCard
              label="Ad Hoc Buffer"
              value={`${bufferHours} hrs`}
              sublabel={`${Math.round(AD_HOC_BUFFER * 100)}% reserved`}
            />
            <SummaryCard
              label={`AM (target ${Math.round(AM_HOUR_TARGET * 100)}%)`}
              value={`${totalAmHours} hrs`}
              sublabel={`${amPercent}% of allocated`}
              highlight={
                totalHours > 0 && Math.abs(amPercent - AM_HOUR_TARGET * 100) > 15
              }
            />
            <SummaryCard
              label={`SEO (target ${Math.round(SEO_HOUR_TARGET * 100)}%)`}
              value={`${totalSeoHours} hrs`}
              sublabel={`${seoPercent}% of allocated`}
              highlight={
                totalHours > 0 && Math.abs(seoPercent - SEO_HOUR_TARGET * 100) > 15
              }
            />
          </div>

          {/* Allocation Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>
                {totalHours} of {allocatableHours} allocatable hours used
                <span className="text-gray-400 ml-1">
                  ({bufferHours} hrs buffer reserved)
                </span>
              </span>
              <span
                className={
                  totalHours > allocatableHours ? 'text-red-500 font-medium' : ''
                }
              >
                {allocatableHours > 0
                  ? Math.round((totalHours / allocatableHours) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  totalHours > allocatableHours ? 'bg-red-400' : 'bg-coral'
                }`}
                style={{
                  width: `${Math.min(
                    allocatableHours > 0
                      ? (totalHours / allocatableHours) * 100
                      : 0,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Objectives */}
          {objectives.length > 0 ? (
            <div className="space-y-6">
              {objectives.map((obj) => {
                const objAmHrs = obj.tasks.reduce((s, t) => s + t.am_hours, 0)
                const objSeoHrs = obj.tasks.reduce((s, t) => s + t.seo_hours, 0)

                return (
                  <div
                    key={obj.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-charcoal">{obj.title}</h3>
                        <Badge
                          variant={
                            obj.scope === 'seo'
                              ? 'coral'
                              : obj.scope === 'am'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {obj.scope.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">
                          {objAmHrs + objSeoHrs} hrs ({objAmHrs} AM / {objSeoHrs} SEO)
                        </span>
                        <button
                          onClick={() => {
                            setEditingObjective(obj)
                            setShowObjectiveForm(true)
                          }}
                          className="text-gray-300 hover:text-gray-500"
                          title="Edit objective"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteObjective(obj.id)}
                          className="text-gray-300 hover:text-red-400"
                          title="Delete objective"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {obj.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="px-5 py-3 flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleCycleStatus(obj.id, task.id)}
                              title="Click to change status"
                            >
                              <StatusDot status={task.status} />
                            </button>
                            <span
                              className={`text-sm ${
                                task.status === 'done'
                                  ? 'text-gray-400 line-through'
                                  : 'text-gray-700'
                              }`}
                            >
                              {task.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            {task.am_hours > 0 && <span>AM: {task.am_hours}h</span>}
                            {task.seo_hours > 0 && (
                              <span>SEO: {task.seo_hours}h</span>
                            )}
                            <Badge
                              variant={
                                task.status === 'done'
                                  ? 'success'
                                  : task.status === 'in_progress'
                                  ? 'coral'
                                  : 'default'
                              }
                            >
                              {task.status === 'in_progress'
                                ? 'In Progress'
                                : task.status === 'done'
                                ? 'Done'
                                : 'Planned'}
                            </Badge>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                              <button
                                onClick={() => {
                                  setActiveObjectiveId(obj.id)
                                  setEditingTask(task)
                                  setShowTaskForm(true)
                                }}
                                className="text-gray-300 hover:text-gray-500"
                                title="Edit task"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(obj.id, task.id)}
                                className="text-gray-300 hover:text-red-400"
                                title="Delete task"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setActiveObjectiveId(obj.id)
                        setEditingTask(null)
                        setShowTaskForm(true)
                      }}
                      className="w-full px-5 py-3 text-sm text-gray-400 hover:text-coral hover:bg-gray-50 flex items-center gap-2 transition-colors border-t border-gray-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add task
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm text-center">
              <p className="text-gray-500 mb-3">
                No objectives planned for this period yet.
              </p>
            </div>
          )}

          {/* Add Objective Button */}
          <button
            onClick={() => {
              setEditingObjective(null)
              setShowObjectiveForm(true)
            }}
            className="mt-6 w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-coral hover:text-coral flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Objective
          </button>
        </>
      )}

      {/* Modals */}
      <Modal
        open={showPeriodForm}
        onClose={() => {
          setShowPeriodForm(false)
          setEditingPeriod(null)
        }}
        title={editingPeriod ? 'Edit Quarter Plan' : 'New Quarter Plan'}
      >
        <PeriodForm
          clientId={clientId}
          period={editingPeriod}
          onSave={handleSavePeriod}
          onCancel={() => {
            setShowPeriodForm(false)
            setEditingPeriod(null)
          }}
        />
      </Modal>

      <Modal
        open={showObjectiveForm}
        onClose={() => {
          setShowObjectiveForm(false)
          setEditingObjective(null)
        }}
        title={editingObjective ? 'Edit Objective' : 'Add Objective'}
      >
        <ObjectiveForm
          objective={editingObjective}
          onSave={handleSaveObjective}
          onCancel={() => {
            setShowObjectiveForm(false)
            setEditingObjective(null)
          }}
        />
      </Modal>

      <Modal
        open={showTaskForm}
        onClose={() => {
          setShowTaskForm(false)
          setEditingTask(null)
          setActiveObjectiveId(null)
        }}
        title={editingTask ? 'Edit Task' : 'Add Task'}
      >
        <TaskForm
          task={editingTask}
          onSave={handleSaveTask}
          onCancel={() => {
            setShowTaskForm(false)
            setEditingTask(null)
            setActiveObjectiveId(null)
          }}
        />
      </Modal>
    </div>
  )
}

function SummaryCard({ label, value, sublabel, highlight }) {
  return (
    <div
      className={`bg-white rounded-xl border p-4 shadow-sm ${
        highlight ? 'border-amber-200' : 'border-gray-100'
      }`}
    >
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-charcoal">{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
    </div>
  )
}

function StatusDot({ status }) {
  const colors = {
    done: 'bg-green-400',
    in_progress: 'bg-coral',
    planned: 'bg-gray-300',
  }

  return (
    <div
      className={`w-2.5 h-2.5 rounded-full ${colors[status]} cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-coral/30 transition-all`}
    />
  )
}
