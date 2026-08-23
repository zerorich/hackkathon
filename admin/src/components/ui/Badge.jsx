import { cn } from '../../lib/utils'

export function Badge({
  children,
  variant = 'primary',
  className = '',
  icon: Icon,
  ...props
}) {
  const variantClass = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    cyan: 'badge-cyan',
    purple: 'badge-purple',
    neutral: 'badge-neutral',
  }[variant] || 'badge-neutral'

  return (
    <span className={cn('badge', variantClass, className)} {...props}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}
