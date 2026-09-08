import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Download, Upload, ChevronDown, Loader2, Check, Circle, AlertTriangle, X, Map as MapIcon, FileSpreadsheet, ListTree, Plus,
} from 'lucide-react'
import { LoadingSpinner, UndoToast } from '@/components'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { useClients, useAuth } from '@/hooks'
import { useSitemapData } from '@/hooks/useSitemapData'
import { REVIEW_CADENCES } from '@/lib/sitemap/defaults'
import { sortedVersions } from '@/lib/sitemap/perf'
import { downloadText } from '@/lib/sitemap/csv'
import { buildWordPressCsv, wordPressFilename } from '@/lib/sitemap/wordpressExport'
import { buildSitemapDataCsv, buildKeywordClusterCsv, dataFilename } from '@/lib/sitemap/dataExport'
import { VersionPills } from './components/VersionPills'
import { Legend } from './components/Legend'
import { TreeView } from './components/TreeView'
import { TableView } from './components/TableView'
import { DetailPanel } from './components/DetailPanel'
import { KeywordsTab } from './components/KeywordsTab'
import { UrlsTab } from './components/UrlsTab'
import { TemplatesTab } from './components/TemplatesTab'
import { SourceStrip } from './components/SourceStrip'
import { ImportModal } from './components/ImportModal'
import { NewVersionModal } from './components/NewVersionModal'
import { AddPageModal } from './components/AddPageModal'
import { MenusModal } from './components/MenusModal'

const TABS = [
  { value: 'sitemap', label: 'Sitemap' },
  { value: 'keywords', label: 'Keyword Research' },
  { value: 'urls', label: 'URL Architecture' },
  { value: 'templates', label: 'Templates' },
]

export default function SitemapTool() {
  const { clientId } = useParams()
  const { clients } = useClients()
  const { user } = useAuth()
  const client = clients.find(c => c.id === clientId)
  const data = useSitemapData(clientId)
  const { sitemap, loading, error, saveStatus, saveError, retrySave } = data

  const [tab, setTab] = useState('sitemap')
  const [view, setView] = useState('tree')
  const [versionId, setVersionId] = useState(null)
  const [selectedPageId, setSelectedPageId] = useState(null)
  const [highlightTemplateId, setHighlightTemplateId] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [versionModal, setVersionModal] = useState(null) // null | { existing: version|null }
  const [addPage, setAddPage] = useState(null)           // null | defaults
  const [showMenus, setShowMenus] = useState(false)
  const [undo, setUndo] = useState(null)
  const [creating, setCreating] = useState(false)

  const versions = useMemo(() => (sitemap ? sortedVersions(sitemap) : []), [sitemap])
  const version = versions.find(v => v.id === versionId) || versions[versions.length - 1] || null
  const isReview = version?.type === 'review'
  const selectedPage = sitemap?.pages.find(p => p.id === selectedPageId) || null

  useEffect(() => { if (!selectedPage && selectedPageId) setSelectedPageId(null) }, [selectedPage, selectedPageId])
  useEffect(() => { if (tab !== 'templates') setHighlightTemplateId(null) }, [tab])

  const selectPage = useCallback((id) => {
    setSelectedPageId(id)
    if (tab === 'keywords' || tab === 'templates') setTab('sitemap')
  }, [tab])

  function jumpToTemplate(templateId) {
    setTab('templates')
    setHighlightTemplateId(templateId)
  }

  function handleAddPage(defaults) {
    if (defaults.url === '/' && defaults.name) {
      const tpl = sitemap.templates.find(t => t.name.toLowerCase() === 'home') || null
      const page = data.addPage({ ...defaults, template_id: tpl?.id || null })
      setSelectedPageId(page.id)
      return
    }
    setAddPage(defaults)
  }

  function handleDeletePage(page) {
    const removed = data.deletePage(page.id)
    setSelectedPageId(null)
    if (removed) setUndo({ message: `Removed "${removed.name}"`, page: removed })
  }

  async function handleCreateVersion({ name, snapshot, uploads, volumeUpdates }) {
    const v = await data.addVersion({ name, type: 'review', snapshot, uploads })
    if (volumeUpdates?.length) await data.applyOperations({ keywordUpdates: volumeUpdates.map(u => ({ keywordId: u.keyword_id, fields: { volume: u.to } })) })
    setVersionId(v.id)
  }

  async function handleReplaceVersion(id, { name, snapshot, uploads, volumeUpdates }) {
    await data.replaceVersionData(id, { snapshot, uploads })
    if (name && name !== version?.name) data.updateVersion(id, { name })
    if (volumeUpdates?.length) await data.applyOperations({ keywordUpdates: volumeUpdates.map(u => ({ keywordId: u.keyword_id, fields: { volume: u.to } })) })
  }

  async function startSitemap(thenImport) {
    setCreating(true)
    try {
      await data.createSitemap()
      if (thenImport) setShowImport(true)
    } finally {
      setCreating(false)
    }
  }

  function exportWordPress() { downloadText(wordPressFilename(client?.name), buildWordPressCsv(sitemap)) }
  function exportData() { downloadText(dataFilename(client?.name, isReview ? version : null, 'sitemap'), buildSitemapDataCsv(sitemap, isReview ? version : null)) }
  function exportKeywords() { downloadText(dataFilename(client?.name, null, 'keyword-clusters'), buildKeywordClusterCsv(sitemap)) }

  // ─── Render ───────────────────────────────────────────────
  if (loading || (!client && clients.length === 0)) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>
  }
  if (!client) {
    return (
      <div className="max-w-2xl">
        <Link to="/sitemap" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-coral mb-6"><ArrowLeft size={16} /> Back to Sitemap Tool</Link>
        <p className="text-gray-500">Client not found.</p>
      </div>
    )
  }

  const saveIndicator = saveStatus === 'saving' ? (
    <span className="text-xs font-normal text-gray-400 inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Saving…</span>
  ) : saveStatus === 'error' ? (
    <span className="text-xs font-normal text-red-500 inline-flex items-center gap-1"><Circle size={8} fill="currentColor" /> Save failed</span>
  ) : saveStatus === 'unsaved' ? (
    <span className="text-xs font-normal text-amber-500 inline-flex items-center gap-1"><Circle size={8} fill="currentColor" /> Unsaved changes</span>
  ) : saveStatus === 'saved' ? (
    <span className="text-xs font-normal text-green-500 inline-flex items-center gap-1"><Check size={12} /> Saved</span>
  ) : null

  return (
    <div className="max-w-[1600px]">
      {saveError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{saveError}</p>
          <button onClick={retrySave} className="text-xs font-medium text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2.5 py-1 rounded transition-colors">Retry</button>
        </div>
      )}
      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <Link to="/sitemap" className="text-gray-400 hover:text-gray-600 mt-1.5" title="Back to Sitemap Tool"><ArrowLeft size={20} /></Link>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">Sitemap Tool · SEO Foundations</div>
            <h1 className="text-2xl font-semibold text-charcoal flex items-center gap-3">
              {client.name}
              {saveIndicator}
            </h1>
            {sitemap && (
              <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-500">
                <span>Review cadence</span>
                <Select value={sitemap.review_cadence} onValueChange={v => data.updateSitemap({ review_cadence: v })}>
                  <SelectTrigger className="h-7 w-auto text-sm border-0 bg-transparent p-0 shadow-none font-medium text-charcoal gap-1 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REVIEW_CADENCES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {sitemap && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              <Upload size={15} className="mr-1.5" /> Import files
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary"><Download size={15} className="mr-1.5" /> Export <ChevronDown size={14} className="ml-1 opacity-60" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-gray-400">For the build</DropdownMenuLabel>
                <DropdownMenuItem onClick={exportWordPress}><FileSpreadsheet size={14} className="mr-2 text-gray-400" /> WordPress import CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowMenus(true)}><ListTree size={14} className="mr-2 text-gray-400" /> Edit WordPress menus…</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-gray-400">Sitemap data</DropdownMenuLabel>
                <DropdownMenuItem onClick={exportData}><MapIcon size={14} className="mr-2 text-gray-400" /> Sitemap &amp; metadata CSV{isReview ? ' (with performance)' : ''}</DropdownMenuItem>
                <DropdownMenuItem onClick={exportKeywords}><FileSpreadsheet size={14} className="mr-2 text-gray-400" /> Keyword clusters CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* No sitemap yet */}
      {!sitemap && (
        <Card className="p-10 text-center max-w-2xl mx-auto mt-10">
          <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4"><MapIcon size={22} className="text-coral" /></div>
          <h2 className="text-lg font-semibold text-charcoal mb-2">No sitemap for {client.name} yet</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
            Import the SEO Foundations files (proposed sitemap, keyword clusters, metadata) and the whole tree lands filled in. Or start from a blank sitemap and build it by hand.
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => startSitemap(true)} disabled={creating}>{creating ? <Loader2 size={16} className="animate-spin mr-1.5" /> : <Upload size={16} className="mr-1.5" />} Import SEO Foundations files</Button>
            <Button variant="secondary" onClick={() => startSitemap(false)} disabled={creating}><Plus size={16} className="mr-1.5" /> Start blank</Button>
          </div>
        </Card>
      )}

      {sitemap && (
        <>
          {/* Toolbar: tabs + versions */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="bg-gray-100">
                {TABS.map(t => (
                  <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-charcoal data-[state=active]:text-white">{t.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <VersionPills
              sitemap={sitemap}
              currentId={version?.id}
              onSelect={setVersionId}
              onRename={(id, name) => data.updateVersion(id, { name })}
              onDelete={(id) => { data.deleteVersion(id); if (id === version?.id) setVersionId(null) }}
              onNew={() => setVersionModal({ existing: null })}
            />
          </div>

          {isReview && (
            <div className="mb-4">
              <SourceStrip
                version={version}
                onReplace={() => setVersionModal({ existing: version })}
                onDeleteUpload={(uploadId) => data.deleteUpload(version.id, uploadId)}
              />
            </div>
          )}

          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0">
              {tab === 'sitemap' && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <Legend isReview={isReview} />
                    <div className="flex bg-gray-100 rounded-lg p-0.5 shrink-0">
                      {['tree', 'table'].map(v => (
                        <button
                          key={v}
                          onClick={() => setView(v)}
                          className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${view === v ? 'bg-white text-charcoal shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  {view === 'tree'
                    ? <TreeView sitemap={sitemap} version={version} selectedPageId={selectedPageId} onSelectPage={selectPage} onAddPage={handleAddPage} />
                    : <TableView sitemap={sitemap} version={version} selectedPageId={selectedPageId} onSelectPage={selectPage} />}
                </>
              )}
              {tab === 'keywords' && <KeywordsTab sitemap={sitemap} onSelectPage={selectPage} />}
              {tab === 'urls' && <UrlsTab sitemap={sitemap} selectedPageId={selectedPageId} onSelectPage={selectPage} />}
              {tab === 'templates' && (
                <TemplatesTab
                  sitemap={sitemap}
                  highlightId={highlightTemplateId}
                  onSelectPage={selectPage}
                  actions={{ addTemplate: data.addTemplate, updateTemplate: data.updateTemplate, deleteTemplate: data.deleteTemplate }}
                />
              )}
            </div>

            <AnimatePresence>
              {selectedPage && tab !== 'templates' && (
                <DetailPanel
                  key={selectedPage.id}
                  sitemap={sitemap}
                  version={version}
                  page={selectedPage}
                  onClose={() => setSelectedPageId(null)}
                  onJumpTemplate={jumpToTemplate}
                  onDeletePage={handleDeletePage}
                  actions={{
                    updatePage: data.updatePage,
                    updatePageUrl: data.updatePageUrl,
                    addKeyword: data.addKeyword,
                    updateKeyword: data.updateKeyword,
                    setPrimaryKeyword: data.setPrimaryKeyword,
                    deleteKeyword: data.deleteKeyword,
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          <ImportModal open={showImport} onClose={() => setShowImport(false)} sitemap={sitemap} onApply={data.applyOperations} />
          <NewVersionModal
            open={!!versionModal}
            onClose={() => setVersionModal(null)}
            sitemap={sitemap}
            existingVersion={versionModal?.existing || null}
            userName={user?.user_metadata?.name || user?.email || null}
            onCreate={handleCreateVersion}
            onReplace={handleReplaceVersion}
          />
          <AddPageModal
            open={!!addPage}
            onClose={() => setAddPage(null)}
            sitemap={sitemap}
            defaults={addPage}
            onAdd={fields => { const p = data.addPage(fields); setSelectedPageId(p.id); setTab('sitemap') }}
          />
          <MenusModal open={showMenus} onClose={() => setShowMenus(false)} menus={sitemap.menus || []} onChange={data.setMenus} />
        </>
      )}

      {undo && (
        <UndoToast
          message={undo.message}
          onUndo={() => { data.restorePage(undo.page); setUndo(null) }}
          onDismiss={() => setUndo(null)}
        />
      )}
    </div>
  )
}
