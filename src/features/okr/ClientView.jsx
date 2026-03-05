import { motion } from 'framer-motion'
import { Globe, FileText, Hash, Check, Target, ListTodo, ChevronDown } from 'lucide-react'
import { Card, CardHeader, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '../../components/ui/select'
import { SCOPE_OPTIONS } from '../../lib/taskLibrary'
import { getPeriodLabel } from '../../lib/constants'

const SCOPE_ICONS = {
  'sitewide': Globe,
  'specific-pages': FileText,
  'keyword-group': Hash,
}

const SCOPE_BORDER_COLORS = {
  'sitewide': 'border-t-blue-500',
  'specific-pages': 'border-t-amber-500',
  'keyword-group': 'border-t-purple-500',
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const cardStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const cardFadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

// ─── Progress Ring SVG ─────────────────────────────────────────

function ProgressRing({ percent, size = 80, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#E8806A" strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-charcoal">{percent}%</span>
      </div>
    </div>
  )
}

// ─── Main Client View ──────────────────────────────────────────

export default function ClientView({
  clientName,
  goal,
  objectives,
  periods,
  selectedPeriodId,
  onPeriodChange,
}) {
  // Find the selected period for its label
  const selectedPeriod = periods.find(p => p.id === selectedPeriodId)
  const periodLabel = selectedPeriod
    ? getPeriodLabel(selectedPeriod.startMonth, selectedPeriod.startYear, selectedPeriod.endMonth, selectedPeriod.endYear)
    : ''

  // Completion calculations
  const totalTasks = objectives.reduce((sum, obj) => sum + obj.keyResults.length, 0)
  const completedTasks = objectives.reduce(
    (sum, obj) => sum + obj.keyResults.filter(kr => kr.status === 'complete').length, 0
  )
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">

      {/* ── Section A: Hero Header ──────────────────────────── */}
      <motion.div
        className="bg-charcoal px-6 py-16 md:py-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="max-w-3xl mx-auto text-center"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs uppercase tracking-[0.2em] text-gray-500 font-medium mb-6"
          >
            Prepared by Distl
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight"
          >
            {clientName}
          </motion.h1>

          {/* Period Selector */}
          <motion.div variants={fadeUp} className="mt-4 flex justify-center">
            {periods.length > 1 ? (
              <Select value={selectedPeriodId} onValueChange={onPeriodChange}>
                <SelectTrigger className="w-auto border-0 bg-transparent text-coral hover:text-coral-light text-lg md:text-xl font-medium shadow-none focus:ring-0 gap-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {getPeriodLabel(p.startMonth, p.startYear, p.endMonth, p.endYear)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-lg md:text-xl text-coral font-medium">{periodLabel}</p>
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="flex justify-center mt-6">
            <div className="w-16 bg-coral rounded-full" style={{ height: 3 }} />
          </motion.div>

          {goal && (
            <motion.p
              variants={fadeUp}
              className="text-lg md:text-xl text-gray-300 font-light italic max-w-2xl mx-auto leading-relaxed mt-6"
            >
              "{goal}"
            </motion.p>
          )}
        </motion.div>
      </motion.div>

      {/* ── Section B: Progress Summary ─────────────────────── */}
      <motion.div
        className="bg-white border-b border-gray-100 px-6 py-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="grid grid-cols-3 gap-8"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            {/* Objectives count */}
            <motion.div variants={fadeUp} className="text-center">
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center">
                  <Target size={20} className="text-coral" />
                </div>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-charcoal">{objectives.length}</p>
              <p className="text-sm text-gray-500 uppercase tracking-wider mt-1">Objectives</p>
            </motion.div>

            {/* Completion ring */}
            <motion.div variants={fadeUp} className="text-center flex flex-col items-center">
              <ProgressRing percent={completionPercent} />
              <p className="text-sm text-gray-500 uppercase tracking-wider mt-2">Complete</p>
            </motion.div>

            {/* Tasks count */}
            <motion.div variants={fadeUp} className="text-center">
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center">
                  <ListTodo size={20} className="text-coral" />
                </div>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-charcoal">{totalTasks}</p>
              <p className="text-sm text-gray-500 uppercase tracking-wider mt-1">Tasks</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Section C: Objectives Grid ──────────────────────── */}
      <div className="bg-cream px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-semibold text-charcoal">Objectives</h2>
            <div className="w-12 bg-coral rounded-full mt-2" style={{ height: 3 }} />
          </motion.div>

          {objectives.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400">No objectives planned for this period.</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
              variants={cardStagger}
              initial="hidden"
              animate="show"
            >
              {objectives.map(obj => {
                const ScopeIcon = SCOPE_ICONS[obj.scope] || Globe
                const scopeOption = SCOPE_OPTIONS.find(s => s.id === obj.scope)
                const borderColor = SCOPE_BORDER_COLORS[obj.scope] || 'border-t-gray-300'
                const objCompleted = obj.keyResults.filter(kr => kr.status === 'complete').length
                const objTotal = obj.keyResults.length
                const objPercent = objTotal > 0 ? Math.round((objCompleted / objTotal) * 100) : 0

                return (
                  <motion.div
                    key={obj.id}
                    variants={cardFadeUp}
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Card className={`overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 ${borderColor}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-charcoal leading-tight">{obj.title}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={scopeOption?.color || 'bg-gray-100 text-gray-600'}>
                                <ScopeIcon size={12} className="mr-1" />
                                {scopeOption?.label || obj.scope}
                              </Badge>
                            </div>
                            {obj.scopeDetail && (
                              <p className="text-sm text-gray-500 mt-1.5">{obj.scopeDetail}</p>
                            )}
                          </div>
                          {objTotal > 0 && (
                            <div className="text-right shrink-0">
                              <p className="text-sm font-medium text-charcoal">{objCompleted}/{objTotal}</p>
                              <p className="text-xs text-gray-400">tasks</p>
                              <div className="w-16 h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                                <motion.div
                                  className="h-full bg-coral rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${objPercent}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {objTotal === 0 ? (
                          <p className="text-sm text-gray-300 py-2">No tasks defined.</p>
                        ) : (
                          <ul className="space-y-3">
                            {obj.keyResults.map(kr => {
                              const isDone = kr.status === 'complete'
                              return (
                                <li key={kr.id} className="flex items-start gap-2.5">
                                  {/* Status indicator (non-interactive) */}
                                  <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                                    isDone
                                      ? 'bg-coral text-white'
                                      : 'border-2 border-gray-200'
                                  }`}>
                                    {isDone && <Check size={12} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${isDone ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                      {kr.task}
                                    </p>
                                    {kr.description && (
                                      <p className="text-xs text-gray-400 mt-0.5">{kr.description}</p>
                                    )}
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </CardContent>

                      {/* Full-width progress bar footer */}
                      {objTotal > 0 && (
                        <div className="h-1 bg-gray-100">
                          <motion.div
                            className="h-full bg-coral"
                            initial={{ width: 0 }}
                            animate={{ width: `${objPercent}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.6 }}
                          />
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Section D: Branded Footer ───────────────────────── */}
      <motion.div
        className="py-10 text-center bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <p className="text-2xl font-bold italic text-coral tracking-tight">distl</p>
        <p className="text-sm text-gray-400 mt-1">Brand Purity. Digital Potency.</p>
      </motion.div>
    </div>
  )
}
