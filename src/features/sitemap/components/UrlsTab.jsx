import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { orderedPages, templateLabel } from '@/lib/sitemap/tree'

export function UrlsTab({ sitemap, selectedPageId, onSelectPage }) {
  const { ordered } = orderedPages(sitemap.pages)
  const tplById = new Map(sitemap.templates.map(t => [t.id, t]))
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>URL structure</TableHead>
            <TableHead>Page</TableHead>
            <TableHead>Template</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map(p => (
            <TableRow key={p.id} data-state={p.id === selectedPageId ? 'selected' : undefined} onClick={() => onSelectPage(p.id)} className="cursor-pointer">
              <TableCell className="font-mono text-xs text-gray-700">{p.url}</TableCell>
              <TableCell className="font-medium text-charcoal">{p.name}</TableCell>
              <TableCell className="text-xs text-gray-500">{templateLabel(tplById.get(p.template_id)) || <span className="text-gray-300">—</span>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
