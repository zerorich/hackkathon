import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  Users,
  Trophy,
  Activity,
  Cpu,
  GraduationCap,
  Layers,
  LogOut,
  FolderKanban,
  ShieldCheck,
  Home,
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
      items: isAdmin
        ? [
            { id: 'ai-jobs', label: 'AI Jobs & Status', icon: Cpu, badge: 'Admin' },
            { id: 'admin-users', label: 'User Directory', icon: ShieldCheck, badge: 'Admin' },
          ]
        : [],
    },
  ]

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '20px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
            }}
          >
            <Home className="w-5 h-5" style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Zehn <span style={{ color: 'var(--primary)' }}>AI</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Panel</div>
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {navSections.filter((section) => section.items.length > 0).map((section, idx) => (
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
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                      background: isActive ? 'var(--primary-light)' : 'transparent',
                      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: isActive ? '600' : '500',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#f1f5f9'
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
                    {isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '0',
                          top: '6px',
                          bottom: '6px',
                          width: '3px',
                          borderRadius: '0 4px 4px 0',
                          backgroundColor: 'var(--primary)',
                        }}
                      />
                    )}
                    <Icon style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && <Badge variant="purple" style={{ fontSize: '0.65rem' }}>{item.badge}</Badge>}
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
          backgroundColor: '#f8f9fb',
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
              backgroundColor: 'var(--primary-light)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              color: 'var(--primary)',
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
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--danger)'
            e.currentTarget.style.background = 'var(--danger-light)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <LogOut style={{ width: '18px', height: '18px' }} />
        </button>
      </div>
    </aside>
  )
}
