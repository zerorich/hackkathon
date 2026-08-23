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
      bg: 'rgba(99, 102, 241, 0.12)',
      text: '#818cf8',
      border: 'rgba(99, 102, 241, 0.25)',
      glow: '0 0 20px -5px rgba(99, 102, 241, 0.25)',
    },
    cyan: {
      bg: 'rgba(6, 182, 212, 0.12)',
      text: '#22d3ee',
      border: 'rgba(6, 182, 212, 0.25)',
      glow: '0 0 20px -5px rgba(6, 182, 212, 0.25)',
    },
    success: {
      bg: 'rgba(16, 185, 129, 0.12)',
      text: '#34d399',
      border: 'rgba(16, 185, 129, 0.25)',
      glow: '0 0 20px -5px rgba(16, 185, 129, 0.25)',
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.12)',
      text: '#fbbf24',
      border: 'rgba(245, 158, 11, 0.25)',
      glow: '0 0 20px -5px rgba(245, 158, 11, 0.25)',
    },
    danger: {
      bg: 'rgba(244, 63, 94, 0.12)',
      text: '#fb7185',
      border: 'rgba(244, 63, 94, 0.25)',
      glow: '0 0 20px -5px rgba(244, 63, 94, 0.25)',
    },
    purple: {
      bg: 'rgba(168, 85, 247, 0.12)',
      text: '#c084fc',
      border: 'rgba(168, 85, 247, 0.25)',
      glow: '0 0 20px -5px rgba(168, 85, 247, 0.25)',
    },
  }[color] || {
    bg: 'rgba(99, 102, 241, 0.12)',
    text: '#818cf8',
    border: 'rgba(99, 102, 241, 0.25)',
    glow: 'none',
  }

  return (
    <div
      className={cn('stat-card animate-fade-in', className)}
      style={{
        boxShadow: colorStyles.glow,
        borderTop: `2px solid ${colorStyles.text}`,
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
            <Icon className="w-5 h-5" />
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
