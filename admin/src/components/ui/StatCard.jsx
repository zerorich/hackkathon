import { cn } from '../../lib/utils'

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  badge,
  className = '',
  ...props
}) {
  const colorStyles = {
    primary: {
      bg: 'rgba(37, 99, 235, 0.08)',
      text: '#2563eb',
      border: 'rgba(37, 99, 235, 0.15)',
    },
    cyan: {
      bg: 'rgba(8, 145, 178, 0.08)',
      text: '#0891b2',
      border: 'rgba(8, 145, 178, 0.15)',
    },
    success: {
      bg: 'rgba(22, 163, 74, 0.08)',
      text: '#16a34a',
      border: 'rgba(22, 163, 74, 0.15)',
    },
    warning: {
      bg: 'rgba(217, 119, 6, 0.08)',
      text: '#d97706',
      border: 'rgba(217, 119, 6, 0.15)',
    },
    danger: {
      bg: 'rgba(220, 38, 38, 0.08)',
      text: '#dc2626',
      border: 'rgba(220, 38, 38, 0.15)',
    },
    purple: {
      bg: 'rgba(124, 58, 237, 0.08)',
      text: '#7c3aed',
      border: 'rgba(124, 58, 237, 0.15)',
    },
  }[color] || {
    bg: 'rgba(37, 99, 235, 0.08)',
    text: '#2563eb',
    border: 'rgba(37, 99, 235, 0.15)',
  }

  return (
    <div
      className={cn('stat-card animate-fade-in', className)}
      style={{
        borderTop: `3px solid ${colorStyles.text}`,
      }}
      {...props}
    >
      <div className="stat-header">
        <span className="stat-label">{title}</span>
        {Icon && (
          <div
            className="stat-icon-wrapper"
            style={{
              backgroundColor: colorStyles.bg,
              color: colorStyles.text,
              border: `1px solid ${colorStyles.border}`,
            }}
          >
            <Icon style={{ width: '20px', height: '20px' }} />
          </div>
        )}
      </div>

      <div className="stat-value">{value}</div>

      {(subtitle || badge) && (
        <div className="stat-footer">
          {badge}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
