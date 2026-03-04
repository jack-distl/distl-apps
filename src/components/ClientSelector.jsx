import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

export function ClientSelector({ clients = [], selected, onSelect }) {
  return (
    <Select value={selected || ''} onValueChange={onSelect}>
      <SelectTrigger className="w-auto min-w-[200px]">
        <SelectValue placeholder="Select client..." />
      </SelectTrigger>
      <SelectContent>
        {clients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            <span className="font-medium">{client.name}</span>
            <span className="text-muted-foreground ml-2">{client.abbreviation}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
