import { useCallback, useSyncExternalStore } from 'react'

// The platform-wide Client view: one switch in the header that turns every
// client screen into what the client sees (the Blueprint, the SEO plan, the
// plans and Results as a report; the Sitemap and every internal control
// hidden). It is for the room: turn it on with the client beside you, walk
// them through their tools, turn it off after. Remembered per browser, like
// the sidebar, so moving between a client's tabs keeps it on. When clients
// get their own logins, this is the layout they will see.

const KEY = 'distl.clientView'
const EVENT = 'distl:client-view'

function read() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

function write(on) {
  try { on ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY) } catch { /* private mode */ }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

/** { clientView, setClientView(on), toggle() } */
export function useClientView() {
  const clientView = useSyncExternalStore(subscribe, read, () => false)
  const setClientView = useCallback(on => write(!!on), [])
  const toggle = useCallback(() => write(!read()), [])
  return { clientView, setClientView, toggle }
}
