import { GraduationCap, RefreshCw } from 'lucide-react'
import { useClass } from '../../stores/ClassContext'
import { useAuth } from '../../stores/AuthContext'

export function Topbar({ onRefresh, isRefreshing = false }) {
  const { classes, selectedClassId, selectClass, loadingClasses } = useClass()
  const { user } = useAuth()

  return (
    <header className="topbar">
      {/* Left: Class Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <GraduationCap style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>Active Class:</span>
        </div>

        {loadingClasses ? (
          <div style={{ width: '180px', height: '36px', borderRadius: '8px' }} className="skeleton" />
        ) : classes.length > 0 ? (
          <select
            value={selectedClassId}
            onChange={(e) => selectClass(e.target.value)}
            className="select"
            style={{
              width: 'auto',
              minWidth: '220px',
              padding: '6px 12px',
              fontWeight: '600',
              backgroundColor: '#fff',
              borderColor: 'var(--border-card)',
            }}
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} (Grade {cls.grade || '—'})
              </option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No classes available</span>
        )}
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Live Status indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: 'var(--success-light)',
            border: '1px solid var(--success-border)',
            fontSize: '0.75rem',
            color: 'var(--success)',
            fontWeight: '600',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
              display: 'inline-block',
            }}
          />
          Live API
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            title="Refresh Data from Server"
          >
            <RefreshCw style={{ width: '14px', height: '14px', ...(isRefreshing ? { animation: 'spin 1s linear infinite' } : {}) }} />
            <span>Sync</span>
          </button>
        )}

        {/* Profile Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.8rem',
            }}
          >
            {user?.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </div>
    </header>
  )
}
