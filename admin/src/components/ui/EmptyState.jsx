import { Inbox } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({
  title = 'No data available',
  description = 'There are no records found for the selected criteria.',
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`}>
      <Icon className="empty-icon" />
      <h4 className="empty-title">{title}</h4>
      <p className="empty-desc">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} style={{ marginTop: '16px' }}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
