import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  Users,
  Trophy,
  Activity,
  Cpu,
  GraduationCap,
  Sparkles,
  Layers,
  LogOut,
  FolderKanban,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../stores/AuthContext'
import { Badge } from '../../components/ui/Badge'

export function Sidebar({ currentRoute, onNavigate }) {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const navSections = [
    {
      title: 'Class Management',
      items: [
        { id: 'classes', label: 'Classes & Rosters', icon: GraduationCap },
        { id: 'subjects', label: 'Subjects & Topics', icon: FolderKanban },
        { id: 'challenges', label: 'Assessments & Arena', icon: Layers },
      ],
    },
    {
      title: 'Analytics & Insights',
      items: [
        { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
        { id: 'analytics', label: 'Detailed Reports', icon: BarChart3 },
        { id: 'analytics-topics', label: 'Topics Analytics', icon: BookOpen },
        { id: 'analytics-students', label: 'Students Analytics', icon: Users },
        { id: 'leaderboard', label: 'Class Leaderboard', icon: Trophy },
        { id: 'activity', label: 'Live Activity', icon: Activity },
      ],
    },
    {
      title: 'System & Administration',
      items: [
        { id: 'ai-jobs', label: 'AI Jobs & Status', icon: Cpu },
        ...(isAdmin
          ? [{ id: 'admin-users', label: 'User Directory', icon: ShieldCheck, badge: 'Admin' }]
          : []),
      ],
    },
  ]

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Teacher & Admin Console</div>
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {navSections.map((section, idx) => (
          <div key={idx} style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                padding: '0 12px 8px',
              }}
            >
              {section.title}
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  currentRoute === item.id ||
                  (item.id === 'classes' && currentRoute.startsWith('class-detail-'))
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      color: isActive ? '#818cf8' : 'var(--text-secondary)',
                      fontWeight: isActive ? '600' : '500',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }
                    }}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && <Badge variant="purple" style={{ fontSize: '0.65rem' }}>{item.badge}</Badge>}
                    {isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '0',
                          top: '6px',
                          bottom: '6px',
                          width: '3px',
                          borderRadius: '0 4px 4px 0',
                          backgroundColor: '#6366f1',
                          boxShadow: '0 0 8px #6366f1',
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            {user?.display_name ? user.display_name.charAt(0).toUpperCase() : 'T'}
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.display_name || 'Teacher'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Badge variant={user?.role === 'ADMIN' ? 'purple' : 'primary'} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                {user?.role || 'TEACHER'}
              </Badge>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign out"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fb7185'
            e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}
