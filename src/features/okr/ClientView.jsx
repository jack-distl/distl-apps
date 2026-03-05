import { motion } from 'framer-motion'
import { Globe, FileText, Hash, Target, ListTodo, CheckCircle, ChevronDown } from 'lucide-react'
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

  const totalTasks = objectives.reduce((sum, obj) => sum + obj.keyResults.length, 0)
  const actionedCount = objectives.filter(obj => obj.isActioned !== false).length

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

      {/* ── Section B: Summary Stats ──────────────────────── */}
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

            {/* Actioned count */}
            <motion.div variants={fadeUp} className="text-center">
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center">
                  <CheckCircle size={20} className="text-coral" />
                </div>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-charcoal">{actionedCount}/{objectives.length}</p>
              <p className="text-sm text-gray-500 uppercase tracking-wider mt-1">Actioned</p>
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
                const isActioned = obj.isActioned !== false
                const objTotal = obj.keyResults.length

                return (
                  <motion.div
                    key={obj.id}
                    variants={cardFadeUp}
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Card className={`overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 border-t-4 ${borderColor} ${
                      !isActioned ? 'opacity-60' : ''
                    }`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-charcoal leading-tight">{obj.title}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={scopeOption?.color || 'bg-gray-100 text-gray-600'}>
                                <ScopeIcon size={12} className="mr-1" />
                                {scopeOption?.label || obj.scope}
                              </Badge>
                              {!isActioned && (
                                <Badge className="bg-gray-100 text-gray-500">Not Actioned</Badge>
                              )}
                            </div>
                            {obj.scopeDetail && (
                              <p className="text-sm text-gray-500 mt-1.5">{obj.scopeDetail}</p>
                            )}
                            {!isActioned && obj.notActionedReason && (
                              <p className="text-xs text-gray-400 italic mt-1.5">{obj.notActionedReason}</p>
                            )}
                          </div>
                          {objTotal > 0 && (
                            <div className="text-right shrink-0">
                              <p className="text-sm font-medium text-charcoal">{objTotal}</p>
                              <p className="text-xs text-gray-400">tasks</p>
                            </div>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {objTotal === 0 ? (
                          <p className="text-sm text-gray-300 py-2">No tasks defined.</p>
                        ) : (
                          <ul className="space-y-3">
                            {obj.keyResults.map(kr => (
                              <li key={kr.id} className="flex items-start gap-2.5">
                                <span className="mt-2 shrink-0 w-1.5 h-1.5 rounded-full bg-gray-300" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-700">
                                    {kr.task}
                                  </p>
                                  {kr.description && (
                                    <p className="text-xs text-gray-400 mt-0.5">{kr.description}</p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
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
