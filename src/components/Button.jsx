export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-coral/50'

  const variants = {
    primary: 'bg-coral text-white hover:bg-coral-dark',
    secondary: 'bg-white text-charcoal border border-gray-200 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
