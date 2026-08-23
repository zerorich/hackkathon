import { useState, useEffect } from 'react'
import { Trophy, Flame, Zap, Medal, Sparkles, GraduationCap } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../stores/AuthContext'
import { useClass } from '../../stores/ClassContext'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'

export function LeaderboardPage() {
  const { user } = useAuth()
  const { activeClass } = useClass()
  const [period, setPeriod] = useState('week') // 'week' | 'all'
  const [leaderboardData, setLeaderboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = async () => {
    if (!activeClass) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await api.get(`/classes/${activeClass.id}/leaderboard?period=${period}`)
      setLeaderboardData(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [activeClass, period])

  const entries = leaderboardData?.entries || []
  const topThree = entries.slice(0, 3)
  const currentRank = leaderboardData?.current_user_rank

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Period Switcher */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Trophy className="w-6 h-6 text-amber-400" />
            Classroom Leaderboard
          </h1>
          <p className="page-subtitle">
            {activeClass ? `Rankings for ${activeClass.name}` : 'Student arena leaderboard'}
          </p>
        </div>

        {/* Period tabs */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            display: 'flex',
            gap: '4px',
          }}
        >
          <button
            onClick={() => setPeriod('week')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: period === 'week' ? '#6366f1' : 'transparent',
              color: period === 'week' ? '#fff' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod('all')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: period === 'all' ? '#6366f1' : 'transparent',
              color: period === 'all' ? '#fff' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All-Time
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton height="300px" borderRadius="18px" />
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState
            icon={Trophy}
            title="Leaderboard is Empty"
            description="Complete lessons and AI practice challenges to be the first on the podium!"
          />
        </Card>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          {topThree.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {topThree.map((item, idx) => {
                const colors = [
                  { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24', medal: '🥇' },
                  { bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.4)', text: '#cbd5e1', medal: '🥈' },
                  { bg: 'rgba(180, 83, 9, 0.15)', border: 'rgba(180, 83, 9, 0.4)', text: '#f59e0b', medal: '🥉' },
                ]
                const col = colors[idx] || colors[0]
                const isCur = item.is_current_user

                return (
                  <Card
                    key={item.user?.id || idx}
                    style={{
                      backgroundColor: col.bg,
                      border: `1.5px solid ${col.border}`,
                      textAlign: 'center',
                      padding: '24px 16px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>{col.medal}</div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#fff', marginBottom: '2px' }}>
                      {item.user?.display_name || 'Champion'} {isCur && '(You)'}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Level {item.user?.level || 1} • Streak {item.streak !== undefined ? item.streak : (item.current_streak || 0)}d
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: col.text, fontFamily: 'var(--font-mono)' }}>
                      {period === 'week' && item.period_xp !== undefined ? item.period_xp : item.total_xp} XP
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Full Ranked Table */}
          <Card>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Full Class Standings
            </h2>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Level</th>
                    <th>Streak</th>
                    <th>Completed Sets</th>
                    <th>{period === 'week' ? 'Weekly XP' : 'Total XP'}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const isCur = entry.is_current_user
                    const displayXp = period === 'week' && entry.period_xp !== undefined ? entry.period_xp : entry.total_xp
                    return (
                      <tr
                        key={entry.user?.id || entry.rank}
                        style={{
                          backgroundColor: isCur ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        }}
                      >
                        <td>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              backgroundColor: entry.rank <= 3 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              color: entry.rank <= 3 ? '#fbbf24' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '800',
                              fontSize: '0.82rem',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {entry.rank}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ fontSize: '1.2rem' }}>
                              {entry.user?.avatar_url || '⚡'}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', color: isCur ? '#818cf8' : 'var(--text-primary)' }}>
                                {entry.user?.display_name || 'Student'} {isCur && '(You)'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge variant="primary">Lvl {entry.user?.level || 1}</Badge>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontWeight: '700', fontSize: '0.85rem' }}>
                            <Flame className="w-3.5 h-3.5" />
                            {entry.streak !== undefined ? entry.streak : (entry.current_streak || 0)}d
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                          {entry.completed_attempts !== undefined ? entry.completed_attempts : (entry.completed_challenges || 0)}
                        </td>
                        <td>
                          <span style={{ fontWeight: '800', color: '#38bdf8', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
                            {displayXp} XP
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
