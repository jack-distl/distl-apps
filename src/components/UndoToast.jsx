import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function UndoToast({ message, onUndo, onDismiss, duration = 5000 }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration])

  const handleUndo = () => {
    setVisible(false)
    onUndo()
  }

  const handleDismiss = () => {
    setVisible(false)
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <AnimatePresence onExitComplete={onDismiss}>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 px-4 py-3 bg-charcoal text-white rounded-lg shadow-lg"
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
