const variants = {
  default: 'bg-gray-100 text-gray-700',
  coral: 'bg-coral/10 text-coral-dark',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
}

export function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
