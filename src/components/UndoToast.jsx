import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export function UndoToast({ message, onUndo, onDismiss, duration = 5000 }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300) // wait for fade-out animation
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  const handleUndo = () => {
    setVisible(false)
    onUndo()
  }

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-charcoal text-white rounded-lg shadow-lg transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <span className="text-sm">{message}</span>
        <button
          onClick={handleUndo}
          className="text-sm font-medium text-coral hover:text-coral-light transition-colors"
        >
          Undo
        </button>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-white transition-colors ml-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
