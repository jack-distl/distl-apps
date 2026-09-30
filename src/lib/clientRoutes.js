// Client URLs use the client's name, not its database id:
//   /okr/amped-digital   /sitemap/amped-digital   /clients/amped-digital
// Old id-based links keep working: a segment that matches an id resolves too.

export function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

/** The URL segment for a client: its name as a slug, or its id when the name gives nothing usable. */
export function clientSlug(client) {
  if (!client) return ''
  if (typeof client === 'string') return client
  return slugify(client.name) || client.id
}

/** Path to one of the apps for a client, e.g. clientPath('okr', client) → "/okr/amped-digital". */
export function clientPath(app, client, ...rest) {
  return ['', app, clientSlug(client), ...rest].join('/')
}

/** Resolve a URL segment to a client: by name first, then by id (old links). */
export function findClientByRef(clients, ref) {
  if (!ref || !clients?.length) return undefined
  const wanted = String(ref).toLowerCase()
  return clients.find(c => clientSlug(c) === wanted) || clients.find(c => c.id === ref)
}
