import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  UserCheck,
  CheckCircle2,
  Percent,
  Layers,
  Swords,
  AlertTriangle,
  Trophy,
  Activity,
  ArrowUpRight,
  TrendingUp,
  BookOpen,
} from 'lucide-react'
import { api } from '../../../lib/api'
import { useClass } from '../../../stores/ClassContext'
import { StatCard } from '../../../components/ui/StatCard'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { StatsGridSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../../components/ui/EmptyState'
import { AccuracyBarChart } from '../../../components/ui/Charts'
import { formatNumber, formatPercent, timeAgo } from '../../../lib/utils'

export function DashboardPage({ onNavigate }) {
  const { selectedClassId, selectedClass } = useClass()
  const [data, setData] = useState(null)
  const [topicsAnalytics, setTopicsAnalytics] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboard = useCallback(async () => {
    if (!selectedClassId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const [dashRes, topicsRes] = await Promise.allSettled([
        api.teacher.getDashboard(selectedClassId),
        api.teacher.getTopicsAnalytics(selectedClassId),
      ])

      if (dashRes.status === 'fulfilled') {
        setData(dashRes.value)
      } else {
        throw dashRes.reason
      }

      if (topicsRes.status === 'fulfilled') {
        setTopicsAnalytics(Array.isArray(topicsRes.value) ? topicsRes.value : [])
      }
    } catch (err) {
      setError(err.message || 'Failed to load class dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [selectedClassId])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (!selectedClassId) {
    return (
      <div className="page-container">
        <EmptyState
          title="No Class Selected"
          description="Please select a class from the topbar or create one to view analytics."
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Teacher Dashboard</h1>
            <p className="page-subtitle">Loading metrics for {selectedClass?.name || 'class'}...</p>
          </div>
        </div>
        <StatsGridSkeleton count={6} />
        <div className="grid-2col">
          <TableSkeleton rows={4} cols={3} />
          <TableSkeleton rows={4} cols={3} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Teacher Dashboard</h1>
        </div>
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Unable to load dashboard"
            description={error}
            actionLabel="Try Again"
            onAction={fetchDashboard}
          />
        </Card>
      </div>
    )
  }

  const {
    total_students = 0,
    active_students = 0,
    completed_attempts = 0,
    average_accuracy = 0,
    total_challenges = 0,
    total_duels = 0,
    weak_topics = [],
    top_students = [],
    recent_activity = [],
  } = data || {}

  const chartTopics = topicsAnalytics.map((t) => ({
    title: t.topic?.title || 'Topic',
    average_accuracy: t.average_accuracy,
    is_weak: t.is_weak,
  }))

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Class Analytics Dashboard
          </h1>
          <p className="page-subtitle">
            Real-time performance metrics and student engagement for{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{selectedClass?.name || 'Active Class'}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('analytics')}
            icon={ArrowUpRight}
          >
            Overview Reports
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('analytics-topics')}
            icon={BookOpen}
          >
            Topic Breakdown
          </Button>
        </div>
      </div>

      {/* 6 Key KPI Metric Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Students"
          value={formatNumber(total_students)}
          icon={Users}
          color="primary"
          subtitle={`${formatNumber(active_students)} active students`}
        />
        <StatCard
          title="Active Students"
          value={formatNumber(active_students)}
          icon={UserCheck}
          color="cyan"
          subtitle={
            total_students > 0
              ? `${Math.round((active_students / total_students) * 100)}% participation`
              : '0% participation'
          }
        />
        <StatCard
          title="Completed Attempts"
          value={formatNumber(completed_attempts)}
          icon={CheckCircle2}
          color="success"
          subtitle="Total challenge submissions"
        />
        <StatCard
          title="Average Accuracy"
          value={formatPercent(average_accuracy)}
          icon={Percent}
          color={average_accuracy >= 70 ? 'success' : average_accuracy >= 50 ? 'warning' : 'danger'}
          subtitle={average_accuracy >= 70 ? 'Optimal mastery' : 'Attention needed'}
        />
        <StatCard
          title="Total Challenges"
          value={formatNumber(total_challenges)}
          icon={Layers}
          color="purple"
          subtitle="Curriculum items"
        />
        <StatCard
          title="Total Duels"
          value={formatNumber(total_duels)}
          icon={Swords}
          color="warning"
          subtitle="PvP Student Battles"
        />
      </div>

      {/* Accuracy by Topic Chart & Weak Topics Spotlight */}
      <div className="grid-2col">
        {/* Topic Accuracy Chart */}
        <Card
          title="Accuracy by Topic"
          subtitle="Live average mastery percentage across all topics"
          icon={TrendingUp}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('analytics-topics')}
            >
              View All →
            </Button>
          }
        >
          <AccuracyBarChart data={chartTopics.length > 0 ? chartTopics : weak_topics} height={200} />
        </Card>

        {/* Weak Topics Spotlight */}
        <Card
          title="Weak Topics Needing Attention"
          subtitle="Topics where class average accuracy is below 60%"
          icon={AlertTriangle}
          actions={
            <Badge variant={weak_topics.length > 0 ? 'danger' : 'success'}>
              {weak_topics.length} {weak_topics.length === 1 ? 'Topic' : 'Topics'}
            </Badge>
          }
        >
          {weak_topics.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center' }}>
              <CheckCircle2 className="w-10 h-10 text-green-600" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>All Topics on Track!</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No topics currently have average accuracy below 60%.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {weak_topics.map((wt) => (
                <div
                  key={wt.topic_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--danger-light)',
                    border: '1px solid var(--danger-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--danger)',
                        boxShadow: '0 0 8px var(--danger)',
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {wt.title}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Action: Generate practice challenge or review in class
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Badge variant="danger">{formatPercent(wt.average_accuracy)}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate(`analytics-topic-${wt.topic_id}`)}
                    >
                      Analyze →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Top Students & Recent Activity */}
      <div className="grid-2col">
        {/* Top Performing Students */}
        <Card
          title="Top Students Leaderboard"
          subtitle="Top performing students by total XP earned"
          icon={Trophy}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('leaderboard')}
            >
              Full Leaderboard →
            </Button>
          }
        >
          {top_students.length === 0 ? (
            <EmptyState title="No Student Activity" description="Students have not earned XP yet." />
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>XP</th>
                    <th>Streak</th>
                    <th>Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {top_students.map((student, idx) => (
                    <tr
                      key={student.user_id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onNavigate(`analytics-student-${student.user_id}`)}
                    >
                      <td>
                        <span
                          style={{
                            fontWeight: '800',
                            color: idx === 0 ? 'var(--warning)' : idx === 1 ? '#94a3b8' : idx === 2 ? 'var(--warning)' : 'var(--text-muted)',
                          }}
                        >
                          #{idx + 1}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {student.display_name}
                        </div>
                      </td>
                      <td>
                        <Badge variant="purple">{formatNumber(student.total_xp)} XP</Badge>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--warning)' }}>
                          🔥 {student.streak || 0}
                        </span>
                      </td>
                      <td>{student.attempts_completed || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Live Recent Activity Stream */}
        <Card
          title="Recent Class Activity"
          subtitle="Live submissions, duels, and milestones"
          icon={Activity}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('activity')}
            >
              All Events →
            </Button>
          }
        >
          {recent_activity.length === 0 ? (
            <EmptyState title="No Recent Activity" description="Class event feed is currently empty." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recent_activity.map((act) => {
                let payloadObj
                try {
                  payloadObj = typeof act.payload === 'string' ? JSON.parse(act.payload) : act.payload || {}
                } catch {
                  payloadObj = {}
                }

                const isAttempt = act.event_type === 'ATTEMPT_COMPLETED'
                const isDuel = act.event_type === 'WON_DUEL' || act.event_type === 'DUEL_COMPLETED'

                return (
                  <div key={act.id} className="activity-item">
                    <div
                      className="activity-icon-wrapper"
                      style={{
                        backgroundColor: isAttempt
                          ? 'var(--success-light)'
                          : isDuel
                          ? 'var(--warning-light)'
                          : 'var(--primary-light)',
                        color: isAttempt ? 'var(--success)' : isDuel ? 'var(--warning)' : 'var(--primary)',
                      }}
                    >
                      {isAttempt ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isDuel ? (
                        <Swords className="w-4 h-4" />
                      ) : (
                        <Activity className="w-4 h-4" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {act.event_type.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {timeAgo(act.created_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {payloadObj.score !== undefined && `Score: ${payloadObj.score} pts`}
                        {payloadObj.winner_id && `Winner: ${payloadObj.winner_id}`}
                        {payloadObj.role && `Role: ${payloadObj.role}`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
