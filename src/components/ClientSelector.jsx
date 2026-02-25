import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function ClientSelector({ clients = [], selected, onSelect }) {
  const [open, setOpen] = useState(false)

  const selectedClient = clients.find((c) => c.id === selected)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
      >
        <span className="text-charcoal font-medium">
          {selectedClient ? selectedClient.name : 'Select client...'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => {
                onSelect(client.id)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <span className="font-medium text-charcoal">{client.name}</span>
              <span className="text-gray-400 ml-2">{client.abbreviation}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
