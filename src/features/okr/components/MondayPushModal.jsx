import { useState, useEffect, useMemo } from 'react'
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../../components/ui/dialog'
import {
  useMondayClientItems,
  useMondayStaff,
  pushPeriodToMonday,
  buildMondayTasks,
  matchClientItem,
} from '../../../hooks/useMondayData'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function MondayPushModal({ open, onClose, client, currentPeriod, onPushed }) {
  const { items, loading, error, fetchItems } = useMondayClientItems()
  const { users: staff, loading: staffLoading, error: staffError, fetchUsers } = useMondayStaff()
  const [selectedItemId, setSelectedItemId] = useState('')
  const [amPersonId, setAmPersonId] = useState('')
  const [seoPersonId, setSeoPersonId] = useState('')
  const [pushing, setPushing] = useState(false)
  const [result, setResult] = useState(null)
  const [pushError, setPushError] = useState(null)

  const tasks = useMemo(() => buildMondayTasks(currentPeriod, client?.abbreviation), [currentPeriod, client])
  const objectiveCount = currentPeriod?.objectives?.length || 0

  const period = currentPeriod && {
    startMonth: currentPeriod.startMonth,
    startYear: currentPeriod.startYear,
    endMonth: currentPeriod.endMonth,
    endYear: currentPeriod.endYear,
  }
  const rangeLabel = period
    ? `${MONTHS[period.startMonth - 1]} ${period.startYear} – ${MONTHS[period.endMonth - 1]} ${period.endYear}`
    : ''

  // Load Monday items + staff when the modal opens; reset state.
  useEffect(() => {
    if (!open) return
    setResult(null)
    setPushError(null)
    setSelectedItemId('')
    setAmPersonId('')
    setSeoPersonId('')
    fetchItems()
    fetchUsers()
  }, [open, fetchItems, fetchUsers])

  // Default-select the best fuzzy match once items arrive.
  useEffect(() => {
    if (!items.length || selectedItemId) return
    const match = matchClientItem(items, client)
    if (match) setSelectedItemId(match.id)
  }, [items, client, selectedItemId])

  async function handlePush() {
    if (!selectedItemId || !tasks.length) return
    setPushing(true)
    setPushError(null)
    setResult(null)
    try {
      const res = await pushPeriodToMonday({
        parentItemId: selectedItemId,
        period,
        tasks,
        amPersonId: amPersonId || undefined,
        seoPersonId: seoPersonId || undefined,
      })
      setResult(res)
      if (res.created > 0 && onPushed && currentPeriod) onPushed(currentPeriod.id)
    } catch (err) {
      setPushError(err.message || 'Push failed')
    } finally {
      setPushing(false)
    }
  }

  const selectedName = items.find(i => i.id === selectedItemId)?.name

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Push to Monday</DialogTitle>
          <DialogDescription>
            Create each key result as a subitem under the client on the SEO Project Management board.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary of what will be pushed */}
          <div className="rounded-lg bg-cream border border-gray-100 px-4 py-3 text-sm text-gray-700">
            <p><span className="font-medium text-charcoal">{tasks.length}</span> task{tasks.length === 1 ? '' : 's'} across <span className="font-medium text-charcoal">{objectiveCount}</span> objective{objectiveCount === 1 ? '' : 's'}</p>
            <p className="text-gray-500 mt-0.5">Scheduled across {rangeLabel} (weekdays), estimated hours filled in. Assignee left blank.</p>
          </div>

          {/* Client item picker */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">
              Monday client (Active Clients group)
            </label>
            {loading ? (
              <p className="text-sm text-gray-400 py-2 inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading clients from Monday…
              </p>
            ) : error ? (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between gap-2">
                <span>{error}</span>
                <button onClick={fetchItems} className="font-medium underline shrink-0">Retry</button>
              </div>
            ) : (
              <select
                value={selectedItemId}
                onChange={e => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
              >
                <option value="">— Select a client —</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* AM / SEO specialist pickers (optional) — assigned on the subitems */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                AM <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={amPersonId}
                onChange={e => setAmPersonId(e.target.value)}
                disabled={staffLoading}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral disabled:bg-gray-50"
              >
                <option value="">{staffLoading ? 'Loading staff…' : '— None —'}</option>
                {staff.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                SEO specialist <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={seoPersonId}
                onChange={e => setSeoPersonId(e.target.value)}
                disabled={staffLoading}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral disabled:bg-gray-50"
              >
                <option value="">{staffLoading ? 'Loading staff…' : '— None —'}</option>
                {staff.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <p className="col-span-2 text-xs text-gray-500 -mt-1">
              Assigned per subitem by the task's time: AM on AM-hour tasks, SEO on SEO-hour tasks, both when a task has both.
            </p>
            {staffError && (
              <div className="col-span-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between gap-2">
                <span>Couldn't load staff: {staffError}</span>
                <button onClick={fetchUsers} className="font-medium underline shrink-0">Retry</button>
              </div>
            )}
          </div>

          {/* Push error */}
          {pushError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{pushError}</span>
            </div>
          )}

          {/* Result summary */}
          {result && (
            <div className={`p-3 border text-sm rounded-lg ${result.failed ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
              <p className="inline-flex items-center gap-2 font-medium">
                {result.failed
                  ? <AlertTriangle size={16} />
                  : <CheckCircle size={16} />}
                Created {result.created} subitem{result.created === 1 ? '' : 's'}
                {result.failed ? `, ${result.failed} failed` : ''}
                {selectedName ? ` under ${selectedName}` : ''}
              </p>
              {result.errors?.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-red-700">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e.name}: {e.error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {result && !result.failed ? null : (
            <Button
              onClick={handlePush}
              disabled={pushing || loading || !selectedItemId || !tasks.length}
            >
              {pushing
                ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Pushing {tasks.length}…</>
                : result
                  ? 'Retry failed'
                  : 'Push to Monday'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
