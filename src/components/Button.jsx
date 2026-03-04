import { Button as ShadButton } from './ui/button'

const variantMap = {
  primary: 'default',
  secondary: 'secondary',
  ghost: 'ghost',
}

const sizeMap = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  return (
    <ShadButton
      variant={variantMap[variant] || variant}
      size={sizeMap[size] || size}
      className={className}
      {...props}
    />
  )
}
