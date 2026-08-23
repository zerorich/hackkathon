import { cn } from '../../lib/utils'

export function Card({
  children,
  title,
  subtitle,
  actions,
  icon: Icon,
  className = '',
  bodyClassName = '',
  ...props
}) {
  return (
    <div className={cn('card animate-fade-in', className)} {...props}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && (
              <div className="card-title">
                {Icon && <Icon className="w-5 h-5 text-indigo-400" />}
                {title}
              </div>
            )}
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}
