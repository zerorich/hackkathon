import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Zap,
  Swords,
  CheckCircle2,
  Percent,
  BookOpen,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { api } from '../../../lib/api'
import { useClass } from '../../../stores/ClassContext'
import { StatCard } from '../../../components/ui/StatCard'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { StatsGridSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../../components/ui/EmptyState'
import {
  formatNumber,
  formatPercent,
  formatDate,
  getAccuracyBadge,
  getMasteryBadge,
} from '../../../lib/utils'

export function StudentDetailPage({ userId, onNavigate }) {
  const { selectedClassId } = useClass()
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStudentDetail = useCallback(async () => {
    if (!selectedClassId || !userId) return
    try {
      setIsLoading(true)
      setError(null)
      const res = await api.teacher.getStudentDetail(selectedClassId, userId)
      setData(res)
    } catch (err) {
      setError(err.message || 'Failed to load student profile')
    } finally {
      setIsLoading(false)
    }
  }, [selectedClassId, userId])

  useEffect(() => {
    fetchStudentDetail()
  }, [fetchStudentDetail])

  if (isLoading) {
    return (
      <div className="page-container">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('analytics-students')}>
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </Button>
        <div className="page-header" style={{ marginTop: '16px' }}>
          <h1 className="page-title">Student Profile & Analytics</h1>
        </div>
        <StatsGridSkeleton count={4} />
        <div className="grid-2col">
          <TableSkeleton rows={4} cols={2} />
          <TableSkeleton rows={4} cols={2} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('analytics-students')}>
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </Button>
        <Card style={{ marginTop: '20px' }}>
          <EmptyState
            icon={AlertTriangle}
            title="Student Not Found"
            description={error || 'Could not load student profile data.'}
            actionLabel="Back to Students"
            onAction={() => onNavigate('analytics-students')}
          />
        </Card>
      </div>
    )
  }

  const {
    profile = {},
    stats = {},
    topic_progress = [],
    duel_stats = {},
    recent_attempts = [],
  } = data

  const { total_xp = 0, level = 1, streak = 0, completed_challenges = 0, average_accuracy = 0 } = stats
  const { wins = 0, losses = 0, draws = 0 } = duel_stats
  const totalDuels = wins + losses + draws
  const winRate = totalDuels > 0 ? (wins / totalDuels) * 100 : 0

  return (
    <div className="page-container">
      {/* Back Link */}
      <div style={{ marginBottom: '16px' }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('analytics-students')}
          icon={ArrowLeft}
        >
          Back to Students Roster
        </Button>
      </div>

      {/* Student Profile Header Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '1.4rem',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
            }}
          >
            {profile.display_name ? profile.display_name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>
                {profile.display_name || 'Student Profile'}
              </h2>
              <Badge variant="primary">Level {level}</Badge>
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {profile.identifier} • Joined {formatDate(profile.created_at)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Badge variant="purple" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            ⚡ {formatNumber(total_xp)} XP
          </Badge>
          <Badge variant="warning" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            🔥 {streak} Day Streak
          </Badge>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Experience"
          value={`${formatNumber(total_xp)} XP`}
          icon={Zap}
          color="purple"
          subtitle={`Current Level ${level}`}
        />
        <StatCard
          title="Completed Challenges"
          value={formatNumber(completed_challenges)}
          icon={CheckCircle2}
          color="primary"
          subtitle="Quizzes & problem sets"
        />
        <StatCard
          title="Average Accuracy"
          value={formatPercent(average_accuracy)}
          icon={Percent}
          color={average_accuracy >= 70 ? 'success' : average_accuracy >= 50 ? 'warning' : 'danger'}
          subtitle="Overall performance"
        />
        <StatCard
          title="Duel Win Rate"
          value={formatPercent(winRate, 0)}
          icon={Swords}
          color="cyan"
          subtitle={`${wins}W / ${losses}L / ${draws}D`}
        />
      </div>

      {/* Topic Mastery Progress & PvP Duel Stats */}
      <div className="grid-2col">
        {/* Topic Mastery Breakdown */}
        <Card
          title="Topic Comprehension Progress"
          subtitle="Mastery category and accuracy by topic"
          icon={BookOpen}
        >
          {topic_progress.length === 0 ? (
            <EmptyState title="No Topic Progress Yet" description="Student has not attempted topics yet." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topic_progress.map((tp) => {
                const masteryBadge = getMasteryBadge(tp.mastery_category)
                const pct = Number(tp.mastery_percent) || 0

                return (
                  <div
                    key={tp.topic_id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {tp.title}
                      </span>
                      <Badge variant={masteryBadge.variant}>{masteryBadge.label}</Badge>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="progress-bar-bg" style={{ flex: 1 }}>
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, pct))}%`,
                            backgroundColor:
                              pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: '700', minWidth: '40px', textAlign: 'right' }}>
                        {formatPercent(pct, 0)}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {tp.attempts_count || 0} attempts completed
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* PvP Duel Record & Recent Attempts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Duel Record Card */}
          <Card title="PvP Duel Record" subtitle="Direct student vs student duels" icon={Swords}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
              <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#34d399' }}>{wins}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Wins</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fb7185' }}>{losses}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Losses</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fbbf24' }}>{draws}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Draws</div>
              </div>
            </div>
          </Card>

          {/* Recent Attempts Card */}
          <Card title="Recent Challenge Submissions" subtitle="Score and accuracy log" icon={Clock}>
            {recent_attempts.length === 0 ? (
              <EmptyState title="No Attempts Yet" description="No challenge attempts submitted." />
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Attempt ID</th>
                      <th>Score</th>
                      <th>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_attempts.map((att) => {
                      const accBadge = getAccuracyBadge(att.accuracy_percent)
                      return (
                        <tr key={att.id}>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {att.id.slice(0, 8)}...
                            </span>
                          </td>
                          <td>
                            <Badge variant="purple">{att.score || 0} pts</Badge>
                          </td>
                          <td>
                            <Badge variant={accBadge.variant}>{accBadge.label}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
