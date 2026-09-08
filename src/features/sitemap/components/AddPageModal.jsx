import { useState, useEffect } from 'react'
import { Modal } from '@/components'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { STATUS_META, STATUSES, normaliseUrl, urlForChild, orderedPages, templateLabel, isHome } from '@/lib/sitemap/tree'
import { defaultTemplateFor } from '@/lib/sitemap/defaults'

export function AddPageModal({ open, onClose, sitemap, defaults, onAdd }) {
  const [name, setName] = useState('')
  const [parentUrl, setParentUrl] = useState('/')
  const [url, setUrl] = useState('')
  const [urlTouched, setUrlTouched] = useState(false)
  const [status, setStatus] = useState('add')
  const [templateId, setTemplateId] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setName(defaults?.name || '')
    setParentUrl(defaults?.parentUrl || '/')
    setUrl(defaults?.url || '')
    setUrlTouched(!!defaults?.url)
    setStatus(defaults?.status || 'add')
    setTemplateId('')
    setError(null)
  }, [open, defaults])

  useEffect(() => {
    if (!urlTouched) setUrl(name ? urlForChild(parentUrl, name) : '')
  }, [name, parentUrl, urlTouched])

  const { ordered } = orderedPages(sitemap?.pages || [])
  const hasHome = ordered.some(isHome)
  const depth = url === '/' ? 0 : url.split('/').filter(Boolean).length

  function submit(e) {
    e.preventDefault()
    const finalUrl = normaliseUrl(url)
    if (!name.trim()) return setError('Give the page a name.')
    if (sitemap.pages.some(p => normaliseUrl(p.url) === finalUrl)) return setError(`A page already uses ${finalUrl}.`)
    const tpl = templateId || defaultTemplateFor({ isHomePage: finalUrl === '/', depth, status }, sitemap.templates)?.id || null
    onAdd({ name: name.trim(), url: finalUrl, status, template_id: tpl })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add page" description="It lands in the tree straight away and everything on it is editable.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Page name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Probate" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Parent</label>
            <Select value={parentUrl} onValueChange={v => { setParentUrl(v); setUrlTouched(false) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="/">{hasHome ? 'Home (top level)' : 'Top level'}</SelectItem>
                {ordered.filter(p => !isHome(p)).map(p => (
                  <SelectItem key={p.id} value={p.url}>{p.name} <span className="text-gray-400 font-mono text-xs">{p.url}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">URL</label>
          <Input value={url} onChange={e => { setUrl(e.target.value); setUrlTouched(true) }} placeholder="/parent/page/" className="font-mono text-xs" />
          <p className="text-[11px] text-gray-400 mt-1">Hierarchy follows the URL. Edit it to move the page.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Template</label>
          <Select value={templateId || '__auto__'} onValueChange={v => setTemplateId(v === '__auto__' ? '' : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__auto__"><span className="text-gray-500">Pick automatically</span></SelectItem>
              {sitemap?.templates.map(t => <SelectItem key={t.id} value={t.id}>{templateLabel(t)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Add page</Button>
        </div>
      </form>
    </Modal>
  )
}
