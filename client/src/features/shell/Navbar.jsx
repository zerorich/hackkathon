import { useState } from 'react'
import {
  Sparkles,
  LayoutDashboard,
  BookOpen,
  Swords,
  Trophy,
  User,
  GraduationCap,
  Plus,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../stores/AuthContext'
import { useClass } from '../../stores/ClassContext'
import { Badge } from '../../components/ui/Badge'
import { JoinClassModal } from '../auth/JoinClassModal'

export function Navbar({ currentRoute, onNavigate }) {
  const { user, logout } = useAuth()
  const { classes, activeClass, selectClass } = useClass()
  const [showJoinModal, setShowJoinModal] = useState(false)

  const navItems = [
    { id: 'dashboard', label: 'Arena', icon: LayoutDashboard },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'duels', label: 'Duels', icon: Swords },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User },
  ]

  return (
    <>
      <header className="navbar">
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => onNavigate('dashboard')}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#fff' }}>
              Maktab <span style={{ color: '#818cf8' }}>AI Arena</span>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="nav-links">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentRoute.startsWith(item.id)
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Right side widgets: Class & User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Class pill */}
          {classes.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={activeClass?.id || ''}
                onChange={(e) => selectClass(e.target.value)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                }}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Class: {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowJoinModal(true)}
                title="Join another class"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '5px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowJoinModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: '#38bdf8',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Join Class
            </button>
          )}

          {/* User profile capsule */}
          <div
            onClick={() => onNavigate('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '1.1rem' }}>{user?.avatar_url || '⚡'}</div>
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {user?.display_name || 'Student'}
            </span>
          </div>
        </div>
      </header>

      {/* Join class modal */}
      <JoinClassModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
    </>
  )
}
