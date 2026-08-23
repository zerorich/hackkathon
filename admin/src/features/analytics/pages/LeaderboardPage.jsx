import { useState, useEffect, useCallback } from 'react'
import {
  Trophy,
  ChevronRight,
  AlertTriangle,
  Crown,
} from 'lucide-react'
import { api } from '../../../lib/api'
import { useClass } from '../../../stores/ClassContext'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../../components/ui/EmptyState'
import {
  formatNumber,
  formatPercent,
  getAccuracyBadge,
} from '../../../lib/utils'

export function LeaderboardPage({ onNavigate }) {
  const { selectedClassId, selectedClass } = useClass()
  const [leaderboard, setLeaderboard] = useState([])
  const [period, setPeriod] = useState('all')
  const [limit, setLimit] = useState(50)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLeaderboard = useCallback(async () => {
    if (!selectedClassId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.teacher.getLeaderboard(selectedClassId, {
        period,
        limit,
      })
      setLeaderboard(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard')
    } finally {
      setIsLoading(false)
    }
  }, [selectedClassId, period, limit])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const top3 = leaderboard.slice(0, 3)

  return (
    <div className="page-container">
      {/* Header & Filter Controls */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Class Leaderboard
          </h1>
          <p className="page-subtitle">
            Ranked student standings and achievements in{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{selectedClass?.name || 'Class'}</strong>
          </p>
        </div>

        {/* Period & Limit Filter Bar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(18, 24, 38, 0.9)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid var(--border-card)',
            }}
          >
            <button
              onClick={() => setPeriod('all')}
              className="btn btn-sm"
              style={{
                background: period === 'all' ? 'var(--primary)' : 'transparent',
                color: period === 'all' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
              }}
            >
              All Time
            </button>
            <button
              onClick={() => setPeriod('week')}
              className="btn btn-sm"
              style={{
                background: period === 'week' ? 'var(--primary)' : 'transparent',
                color: period === 'week' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
              }}
            >
              This Week
            </button>
          </div>

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="select"
            style={{ width: 'auto' }}
          >
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : error ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Failed to load leaderboard"
            description={error}
            actionLabel="Retry"
            onAction={fetchLeaderboard}
          />
        </Card>
      ) : leaderboard.length === 0 ? (
        <Card>
          <EmptyState
            icon={Trophy}
            title="No Leaderboard Entries"
            description="Students have not earned XP in this period yet."
          />
        </Card>
      ) : (
        <>
          {/* Top 3 Podium Cards (if >= 3 entries) */}
          {top3.length >= 3 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              {/* Rank 2 (Silver) */}
              <div
                style={{
                  background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.12) 0%, rgba(18, 24, 38, 0.8) 100%)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  marginTop: '20px',
                }}
                onClick={() => onNavigate(`analytics-student-${top3[1]?.user?.id}`)}
              >
                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)' }}>
                  <Badge variant="neutral" style={{ backgroundColor: '#64748b', color: '#fff', fontWeight: '800' }}>
                    🥈 #2 Place
                  </Badge>
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '8px' }}>
                  {top3[1]?.user?.display_name || 'Student'}
                </div>
                <div style={{ color: '#c084fc', fontWeight: '800', fontSize: '1.2rem', marginTop: '4px' }}>
                  {formatNumber(top3[1]?.total_xp)} XP
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {formatPercent(top3[1]?.accuracy)} accuracy • {top3[1]?.duel_wins || 0} duel wins
                </div>
              </div>

              {/* Rank 1 (Gold - Champion) */}
              <div
                style={{
                  background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.18) 0%, rgba(18, 24, 38, 0.9) 100%)',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  borderRadius: '16px',
                  padding: '24px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: '0 0 30px -5px rgba(251, 191, 36, 0.3)',
                }}
                onClick={() => onNavigate(`analytics-student-${top3[0]?.user?.id}`)}
              >
                <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)' }}>
                  <Badge variant="warning" style={{ backgroundColor: '#f59e0b', color: '#000', fontWeight: '800' }}>
                    👑 #1 Champion
                  </Badge>
                </div>
                <Crown className="w-8 h-8 text-yellow-400" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>
                  {top3[0]?.user?.display_name || 'Student'}
                </div>
                <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '1.4rem', marginTop: '4px' }}>
                  {formatNumber(top3[0]?.total_xp)} XP
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {formatPercent(top3[0]?.accuracy)} accuracy • {top3[0]?.duel_wins || 0} duel wins
                </div>
              </div>

              {/* Rank 3 (Bronze) */}
              <div
                style={{
                  background: 'linear-gradient(180deg, rgba(217, 119, 6, 0.12) 0%, rgba(18, 24, 38, 0.8) 100%)',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  marginTop: '20px',
                }}
                onClick={() => onNavigate(`analytics-student-${top3[2]?.user?.id}`)}
              >
                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)' }}>
                  <Badge variant="warning" style={{ backgroundColor: '#b45309', color: '#fff', fontWeight: '800' }}>
                    🥉 #3 Place
                  </Badge>
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '8px' }}>
                  {top3[2]?.user?.display_name || 'Student'}
                </div>
                <div style={{ color: '#c084fc', fontWeight: '800', fontSize: '1.2rem', marginTop: '4px' }}>
                  {formatNumber(top3[2]?.total_xp)} XP
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {formatPercent(top3[2]?.accuracy)} accuracy • {top3[2]?.duel_wins || 0} duel wins
                </div>
              </div>
            </div>
          )}

          {/* Full Leaderboard Table */}
          <Card>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Total XP</th>
                    <th>Accuracy</th>
                    <th>Completed Challenges</th>
                    <th>Duel Wins</th>
                    <th>Streak</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, idx) => {
                    const user = row.user || {}
                    const rank = row.rank || idx + 1
                    const accBadge = getAccuracyBadge(row.accuracy)

                    return (
                      <tr
                        key={user.id || idx}
                        style={{ cursor: 'pointer' }}
                        onClick={() => user.id && onNavigate(`analytics-student-${user.id}`)}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {rank === 1 ? (
                              <span style={{ fontSize: '1.1rem' }}>🥇</span>
                            ) : rank === 2 ? (
                              <span style={{ fontSize: '1.1rem' }}>🥈</span>
                            ) : rank === 3 ? (
                              <span style={{ fontSize: '1.1rem' }}>🥉</span>
                            ) : (
                              <span style={{ fontWeight: '800', color: 'var(--text-muted)', minWidth: '24px' }}>
                                #{rank}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                                color: '#818cf8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                              }}
                            >
                              {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                {user.display_name || 'Student'}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {user.identifier}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <Badge variant="purple" style={{ fontWeight: '700' }}>
                            ⚡ {formatNumber(row.total_xp)} XP
                          </Badge>
                        </td>

                        <td>
                          <Badge variant={accBadge.variant}>{accBadge.label}</Badge>
                        </td>

                        <td>
                          <span style={{ fontWeight: '600' }}>{row.completed_challenges || 0}</span>
                        </td>

                        <td>
                          <span style={{ color: '#22d3ee', fontWeight: '600' }}>
                            ⚔️ {row.duel_wins || 0}
                          </span>
                        </td>

                        <td>
                          <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: '600' }}>
                            🔥 {row.streak || 0}d
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (user.id) onNavigate(`analytics-student-${user.id}`)
                            }}
                            icon={ChevronRight}
                          >
                            Profile
                          </Button>
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
