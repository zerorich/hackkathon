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
          <GraduationCap className="w-5 h-5 text-indigo-400" />
          <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>Active Class:</span>
        </div>

        {loadingClasses ? (
          <div style={{ width: '180px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
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
              backgroundColor: 'rgba(19, 27, 46, 0.9)',
              borderColor: 'rgba(99, 102, 241, 0.3)',
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
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            fontSize: '0.75rem',
            color: '#34d399',
            fontWeight: '600',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981',
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
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
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
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
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
