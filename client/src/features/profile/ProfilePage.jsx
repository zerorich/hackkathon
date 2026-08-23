import { useState, useEffect } from 'react'
import {
  User,
  Zap,
  Flame,
  Trophy,
  Swords,
  CheckCircle2,
  BookOpen,
  LogOut,
  Edit2,
  Clock,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../stores/AuthContext'
import { useClass } from '../../stores/ClassContext'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { OnboardingModal } from '../auth/OnboardingModal'

export function ProfilePage({ onNavigate }) {
  const { user, logout } = useAuth()
  const { activeClass } = useClass()
  const [stats, setStats] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)

  const fetchProfileData = async () => {
    setLoading(true)
    try {
      const [statsRes, attemptsRes] = await Promise.all([
        api.get('/me/stats').catch(() => null),
        api.get('/me/attempts?limit=10').catch(() => ({ items: [] })),
      ])
      setStats(statsRes)
      setAttempts(attemptsRes?.items || attemptsRes || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfileData()
  }, [])

  const s = stats || {}
  const totalXp = s.total_xp || user?.total_xp || 0
  const level = s.level || user?.level || 1
  const streak = s.current_streak !== undefined ? s.current_streak : (s.streak || user?.streak || 0)
  const bestStreak = s.best_streak || streak
  const completedCount = s.completed_challenges ?? (s.attempts_completed ?? attempts.length)
  const duelsWon = s.duel_wins ?? (s.duels_won ?? 0)
  const duelsLost = s.duel_losses ?? (s.duels_lost ?? 0)

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Profile Header */}
      <Card
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: '30px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '20px',
                backgroundColor: 'rgba(99, 102, 241, 0.25)',
                border: '2px solid rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.8rem',
              }}
            >
              {user?.avatar_url || '⚡'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>
                  {user?.display_name || 'Champion Student'}
                </h1>
                <Badge variant="primary">Level {level}</Badge>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {user?.identifier} • {activeClass ? `Class: ${activeClass.name}` : 'Maktab Student'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" size="sm" icon={Edit2} onClick={() => setShowEditModal(true)}>
              Edit Profile
            </Button>
            <Button variant="ghost" size="sm" icon={LogOut} onClick={logout} style={{ color: '#f87171' }}>
              Sign Out
            </Button>
          </div>
        </div>
      </Card>

      {/* 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <Card style={{ textAlign: 'center', padding: '20px 14px' }}>
          <Zap className="w-6 h-6 text-indigo-400" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
            {totalXp}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Arena XP
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '20px 14px' }}>
          <Flame className="w-6 h-6 text-amber-400" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
            {streak}d
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Current Streak (Best: {bestStreak}d)
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '20px 14px' }}>
          <CheckCircle2 className="w-6 h-6 text-emerald-400" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
            {completedCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Challenges Completed
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '20px 14px' }}>
          <Swords className="w-6 h-6 text-rose-400" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fb7185', fontFamily: 'var(--font-mono)' }}>
            {duelsWon}W / {duelsLost}L
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Duel Battle Record
          </div>
        </Card>
      </div>

      {/* Recent Attempts History */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock className="w-5 h-5 text-cyan-400" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Recent Practice History
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton height="160px" borderRadius="12px" />
        ) : attempts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No challenge attempts recorded yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Accuracy</th>
                  <th>XP Earned</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((att) => (
                  <tr key={att.id}>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {att.challenge?.title || att.challenge_title || 'Topic Challenge'}
                    </td>
                    <td>
                      <Badge variant={att.status === 'COMPLETED' ? 'emerald' : 'amber'}>
                        {att.status}
                      </Badge>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#38bdf8' }}>
                      {att.score !== undefined ? `${att.score}/1000` : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {att.accuracy_percent !== undefined ? `${att.accuracy_percent}%` : (att.accuracy !== undefined ? `${att.accuracy}%` : '—')}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#818cf8', fontWeight: '700' }}>
                      {att.xp_awarded ? `+${att.xp_awarded} XP` : '—'}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {att.completed_at ? new Date(att.completed_at).toLocaleDateString() : 'In Progress'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <OnboardingModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} />
    </div>
  )
}
