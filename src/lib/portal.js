// Radix portals render into document.body by default. Inside wp-admin that
// is outside #distl-root, where none of the app's (scoped) styles apply, so
// every portal targets #distl-portal instead. Falls back to body in dev.
export function getPortalContainer() {
  if (typeof document === 'undefined') return undefined
  return document.getElementById('distl-portal') || undefined
}
