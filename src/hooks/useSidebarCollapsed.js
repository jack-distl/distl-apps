import { useCallback, useSyncExternalStore } from 'react'

// Whether the desktop sidebar is collapsed to an icon rail. Remembered per
// browser, like the Client view switch. The mobile drawer always opens in full.

const KEY = 'distl.sidebarCollapsed'
const EVENT = 'distl:sidebar-collapsed'

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

export function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, read, () => false)
  const toggle = useCallback(() => write(!read()), [])
  return { collapsed, toggle }
}
