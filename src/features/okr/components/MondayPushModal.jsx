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

  // After a partial push, only the tasks Monday refused are sent again; the
  // ones it created (including those whose update note failed) are not.
  const failedNames = new Set((result?.errors || []).filter(e => !e.created).map(e => e.name))
  const toPush = result ? tasks.filter(t => failedNames.has(t.name)) : tasks

  async function handlePush() {
    if (!selectedItemId || !toPush.length) return
    setPushing(true)
    setPushError(null)
    setResult(null)
    try {
      const res = await pushPeriodToMonday({
        parentItemId: selectedItemId,
        period,
        tasks: toPush,
        amPersonId: amPersonId || undefined,
        seoPersonId: seoPersonId || undefined,
      })
      // Keep the running total across a retry
      setResult(prev => prev ? {
        ...res,
        created: (prev.created || 0) + (res.created || 0),
        errors: [...(prev.errors || []).filter(e => e.created), ...(res.errors || [])],
        failed: res.failed || 0,
      } : res)
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
            Create each task as a subitem under the client on the SEO Project Management board.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary of what will be pushed */}
          <div className="rounded-xl bg-sage-light px-4 py-3 text-sm text-ink">
            <p><span className="font-medium text-ink">{tasks.length}</span> task{tasks.length === 1 ? '' : 's'} across <span className="font-medium text-ink">{objectiveCount}</span> objective{objectiveCount === 1 ? '' : 's'}</p>
            <p className="text-ink-soft mt-0.5">Scheduled across {rangeLabel} (weekdays), with estimated hours. Pick the people below, or leave them for Monday.</p>
          </div>

          {/* Client item picker */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Monday client (Active Clients group)
            </label>
            {loading ? (
              <p className="text-sm text-ink-faint py-2 inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading clients from Monday…
              </p>
            ) : error ? (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl flex items-center justify-between gap-2">
                <span>{error}</span>
                <button onClick={fetchItems} className="font-medium underline shrink-0">Retry</button>
              </div>
            ) : (
              <select
                value={selectedItemId}
                onChange={e => setSelectedItemId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-sage-line bg-white text-sm text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30"
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
              <label className="block text-sm font-medium text-ink mb-1.5">
                AM <span className="text-ink-faint font-normal">(optional)</span>
              </label>
              <select
                value={amPersonId}
                onChange={e => setAmPersonId(e.target.value)}
                disabled={staffLoading}
                className="w-full h-9 px-3 rounded-xl border border-sage-line bg-white text-sm text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30 disabled:bg-sage-light"
              >
                <option value="">{staffLoading ? 'Loading staff…' : '— None —'}</option>
                {staff.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                SEO specialist <span className="text-ink-faint font-normal">(optional)</span>
              </label>
              <select
                value={seoPersonId}
                onChange={e => setSeoPersonId(e.target.value)}
                disabled={staffLoading}
                className="w-full h-9 px-3 rounded-xl border border-sage-line bg-white text-sm text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-pink/30 disabled:bg-sage-light"
              >
                <option value="">{staffLoading ? 'Loading staff…' : '— None —'}</option>
                {staff.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <p className="col-span-2 text-xs text-ink-soft -mt-1">
              Assigned per subitem by the task's time: AM on AM-hour tasks, SEO on SEO-hour tasks, both when a task has both.
            </p>
            {staffError && (
              <div className="col-span-2 p-2.5 bg-red-50 text-red-700 text-xs rounded-xl flex items-center justify-between gap-2">
                <span>Couldn't load staff: {staffError}</span>
                <button onClick={fetchUsers} className="font-medium underline shrink-0">Retry</button>
              </div>
            )}
          </div>

          {/* Push error */}
          {pushError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{pushError}</span>
            </div>
          )}

          {/* Result summary */}
          {result && (
            <div className={`p-3 text-sm rounded-xl ${result.failed ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
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
          <Button variant="secondary" onClick={onClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {result && !toPush.length ? null : (
            <Button
              onClick={handlePush}
              disabled={pushing || loading || !selectedItemId || !toPush.length}
            >
              {pushing
                ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Pushing {toPush.length}…</>
                : result
                  ? `Retry the ${toPush.length} that failed`
                  : 'Push to Monday'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
