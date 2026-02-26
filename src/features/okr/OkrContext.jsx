import { createContext, useContext, useReducer } from 'react'
import { mockClients, mockOkrPeriods, mockObjectives } from '../../lib/mockData'

const OkrContext = createContext(null)

let nextId = 100

function generateId(prefix = '') {
  return `${prefix}${nextId++}`
}

const initialState = {
  clients: mockClients,
  periods: mockOkrPeriods,
  objectives: mockObjectives,
}

function okrReducer(state, action) {
  switch (action.type) {
    case 'ADD_PERIOD':
      return {
        ...state,
        periods: [...state.periods, { ...action.payload, id: generateId('p') }],
      }
    case 'UPDATE_PERIOD':
      return {
        ...state,
        periods: state.periods.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload } : p
        ),
      }
    case 'DELETE_PERIOD':
      return {
        ...state,
        periods: state.periods.filter((p) => p.id !== action.payload),
        objectives: state.objectives.filter((o) => o.period_id !== action.payload),
      }
    case 'TOGGLE_PUBLISHED':
      return {
        ...state,
        periods: state.periods.map((p) =>
          p.id === action.payload ? { ...p, is_published: !p.is_published } : p
        ),
      }

    case 'ADD_OBJECTIVE': {
      const periodObjectives = state.objectives.filter(
        (o) => o.period_id === action.payload.period_id
      )
      return {
        ...state,
        objectives: [
          ...state.objectives,
          {
            ...action.payload,
            id: generateId('o'),
            sort_order: periodObjectives.length,
            tasks: [],
          },
        ],
      }
    }
    case 'UPDATE_OBJECTIVE':
      return {
        ...state,
        objectives: state.objectives.map((o) =>
          o.id === action.payload.id
            ? { ...o, title: action.payload.title, scope: action.payload.scope }
            : o
        ),
      }
    case 'DELETE_OBJECTIVE':
      return {
        ...state,
        objectives: state.objectives.filter((o) => o.id !== action.payload),
      }

    case 'ADD_TASK':
      return {
        ...state,
        objectives: state.objectives.map((o) =>
          o.id === action.payload.objectiveId
            ? {
                ...o,
                tasks: [
                  ...o.tasks,
                  { ...action.payload.task, id: generateId('t') },
                ],
              }
            : o
        ),
      }
    case 'UPDATE_TASK':
      return {
        ...state,
        objectives: state.objectives.map((o) =>
          o.id === action.payload.objectiveId
            ? {
                ...o,
                tasks: o.tasks.map((t) =>
                  t.id === action.payload.taskId
                    ? { ...t, ...action.payload.updates }
                    : t
                ),
              }
            : o
        ),
      }
    case 'DELETE_TASK':
      return {
        ...state,
        objectives: state.objectives.map((o) =>
          o.id === action.payload.objectiveId
            ? {
                ...o,
                tasks: o.tasks.filter((t) => t.id !== action.payload.taskId),
              }
            : o
        ),
      }
    case 'CYCLE_TASK_STATUS': {
      const statusOrder = ['planned', 'in_progress', 'done']
      return {
        ...state,
        objectives: state.objectives.map((o) =>
          o.id === action.payload.objectiveId
            ? {
                ...o,
                tasks: o.tasks.map((t) => {
                  if (t.id !== action.payload.taskId) return t
                  const idx = statusOrder.indexOf(t.status)
                  return { ...t, status: statusOrder[(idx + 1) % statusOrder.length] }
                }),
              }
            : o
        ),
      }
    }

    default:
      return state
  }
}

export function OkrProvider({ children }) {
  const [state, dispatch] = useReducer(okrReducer, initialState)

  return (
    <OkrContext.Provider value={{ state, dispatch }}>
      {children}
    </OkrContext.Provider>
  )
}

export function useOkr() {
  const context = useContext(OkrContext)
  if (!context) {
    throw new Error('useOkr must be used within an OkrProvider')
  }
  return context
}
