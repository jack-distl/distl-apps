import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
}

export function LoadingSpinner({ size = 'md', className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15 }}
      className={cn('flex items-center justify-center', className)}
    >
      <div
        className={cn(sizes[size], 'border-2 border-gray-200 border-t-coral rounded-full animate-spin')}
      />
    </motion.div>
  )
}
