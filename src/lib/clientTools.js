// A client's tabs: Overview, SEO plan, Sitemap.
//
// The WordPress build (distl-app-wp) has the same row with more in it (the
// Blueprint, the service plans, Results). This app has the SEO tools, so its
// row is the client's Overview and those two. The labels and the Client view
// rule match, so moving between the two apps feels the same.

import { clientPath } from './clientRoutes.js'

export const TAB_LABELS = { overview: 'Overview', okr: 'SEO plan', sitemap: 'Sitemap' }

/**
 * The tabs the client never gets: the Sitemap is the team's working tool
 * (the proposed structure, keywords, review uploads). Its numbers reach the
 * client through the SEO plan.
 */
export const INTERNAL_TABS = ['sitemap']

/**
 * [{ id, label, href }] for a client. With `clientView` the internal tabs
 * are left out, which is the row the client sees in the room.
 */
export function clientTabs(client, { clientView = false } = {}) {
  if (!client) return []
  const tabs = [
    { id: 'overview', label: TAB_LABELS.overview, href: clientPath('clients', client) },
    { id: 'okr', label: TAB_LABELS.okr, href: clientPath('okr', client) },
    { id: 'sitemap', label: TAB_LABELS.sitemap, href: clientPath('sitemap', client) },
  ]
  return clientView ? tabs.filter(t => !INTERNAL_TABS.includes(t.id)) : tabs
}

/** The tab a path belongs to, or null. */
export function activeTab(tabs, pathname) {
  const match = tabs
    .filter(t => pathname === t.href || pathname.startsWith(t.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return match?.id || null
}
