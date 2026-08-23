import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Users,
  CheckCircle2,
  Percent,
  Award,
  AlertTriangle,
  Flame,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { api } from '../../../lib/api'
import { StatCard } from '../../../components/ui/StatCard'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { StatsGridSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../../components/ui/EmptyState'
import { MasteryDonutChart, AccuracyGauge } from '../../../components/ui/Charts'
import {
  formatNumber,
  formatPercent,
  timeAgo,
  getAccuracyBadge,
} from '../../../lib/utils'

export function TopicDetailPage({ topicId, onNavigate }) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTopicAnalytics = useCallback(async () => {
    if (!topicId) return
    try {
      setIsLoading(true)
      setError(null)
      const res = await api.teacher.getTopicAnalytics(topicId)
      setData(res)
    } catch (err) {
      setError(err.message || 'Failed to load topic deep dive')
    } finally {
      setIsLoading(false)
    }
  }, [topicId])

  useEffect(() => {
    fetchTopicAnalytics()
  }, [fetchTopicAnalytics])

  if (isLoading) {
    return (
      <div className="page-container">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('analytics-topics')}>
          <ArrowLeft className="w-4 h-4" /> Back to Topics
        </Button>
        <div className="page-header" style={{ marginTop: '16px' }}>
          <h1 className="page-title">Topic Analytics Deep Dive</h1>
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
        <Button variant="ghost" size="sm" onClick={() => onNavigate('analytics-topics')}>
          <ArrowLeft className="w-4 h-4" /> Back to Topics
        </Button>
        <Card style={{ marginTop: '20px' }}>
          <EmptyState
            icon={AlertTriangle}
            title="Topic Analytics Not Found"
            description={error || 'Could not find analytics for this topic.'}
            actionLabel="Back to Topics"
            onAction={() => onNavigate('analytics-topics')}
          />
        </Card>
      </div>
    )
  }

  const {
    participants = 0,
    attempts_count = 0,
    average_accuracy = 0,
    average_score = 0,
    mastery_distribution = {},
    strongest_students = [],
    students_needing_attention = [],
    recent_attempts = [],
  } = data

  const isWeak = attempts_count >= 3 && average_accuracy < 60

  return (
    <div className="page-container">
      {/* Back button & Title */}
      <div style={{ marginBottom: '16px' }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('analytics-topics')}
          icon={ArrowLeft}
        >
          Back to Topics Analytics
        </Button>
      </div>

      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="page-title">
              <BookOpen className="w-6 h-6 text-blue-600" />
              Topic Deep Dive Analysis
            </h1>
            {isWeak ? (
              <Badge variant="danger" icon={AlertTriangle}>
                Needs Class Review
              </Badge>
            ) : (
              <Badge variant="success">Mastery on Track</Badge>
            )}
          </div>
          <p className="page-subtitle">Topic ID: {topicId}</p>
        </div>
      </div>

      {/* 4 Key KPI Metrics */}
      <div className="stats-grid">
        <StatCard
          title="Active Participants"
          value={formatNumber(participants)}
          icon={Users}
          color="primary"
          subtitle="Students attempting questions"
        />
        <StatCard
          title="Total Attempts"
          value={formatNumber(attempts_count)}
          icon={CheckCircle2}
          color="cyan"
          subtitle="Submissions analyzed"
        />
        <StatCard
          title="Average Accuracy"
          value={formatPercent(average_accuracy)}
          icon={Percent}
          color={average_accuracy >= 70 ? 'success' : average_accuracy >= 50 ? 'warning' : 'danger'}
          subtitle={isWeak ? 'Below 60% threshold' : 'Mastery criteria met'}
        />
        <StatCard
          title="Average Score"
          value={`${Math.round(average_score)} pts`}
          icon={Award}
          color="purple"
          subtitle="Points per attempt"
        />
      </div>

      {/* Mastery Distribution & Gauge */}
      <div className="grid-2col">
        {/* Mastery Distribution Donut */}
        <Card
          title="Mastery Distribution"
          subtitle="Categorization of students by comprehension levels"
          icon={TrendingUp}
        >
          <MasteryDonutChart
            distribution={mastery_distribution}
            totalStudents={participants}
            size={190}
          />
        </Card>

        {/* Accuracy Gauge & Review recommendation */}
        <Card
          title="Performance Gauge & Recommendations"
          subtitle="AI assessment of topic comprehension"
          icon={Percent}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
            <AccuracyGauge value={average_accuracy} size={130} label="Accuracy" />
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {isWeak ? '⚠️ Topic Remediation Recommended' : '✨ Strong Class Mastery'}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {isWeak
                  ? 'More than 3 attempts have been recorded with class accuracy under 60%. Consider assigning supplementary AI practice challenges.'
                  : 'Students demonstrate high proficiency on this topic. Ready to advance to harder challenges or PvP Duels.'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Strongest Students vs Students Needing Attention */}
      <div className="grid-2col">
        {/* Strongest Students */}
        <Card
          title="Top Mastering Students"
          subtitle="Highest topic mastery score"
          icon={Flame}
          actions={<Badge variant="success">High Mastery</Badge>}
        >
          {strongest_students.length === 0 ? (
            <EmptyState title="No Student Records" description="No students have completed attempts on this topic." />
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Mastery %</th>
                    <th style={{ textAlign: 'right' }}>Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {strongest_students.map((st, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {st.user?.display_name || st.user?.identifier || 'Student'}
                        </div>
                      </td>
                      <td>
                        <Badge variant="success">{formatPercent(st.mastery_percent)}</Badge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {st.user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigate(`analytics-student-${st.user.id}`)}
                          >
                            View →
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Students Needing Attention */}
        <Card
          title="Students Needing Support"
          subtitle="Students with low accuracy on this topic"
          icon={AlertTriangle}
          actions={<Badge variant="danger">Intervention</Badge>}
        >
          {students_needing_attention.length === 0 ? (
            <EmptyState title="All Students Proficient" description="No struggling students detected." />
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Mastery %</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students_needing_attention.map((st, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--danger)' }}>
                          {st.user?.display_name || st.user?.identifier || 'Student'}
                        </div>
                      </td>
                      <td>
                        <Badge variant="danger">{formatPercent(st.mastery_percent)}</Badge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {st.user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigate(`analytics-student-${st.user.id}`)}
                          >
                            Profile →
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Attempts History */}
      <Card
        title="Recent Attempts History"
        subtitle="Chronological log of challenge submissions for this topic"
        icon={Clock}
      >
        {recent_attempts.length === 0 ? (
          <EmptyState title="No Attempts Logged" description="No attempts recorded for this topic." />
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Attempt ID</th>
                  <th>Student ID</th>
                  <th>Score</th>
                  <th>Accuracy</th>
                  <th>Completed</th>
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
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {att.user_id}
                        </span>
                      </td>
                      <td>
                        <Badge variant="purple">{att.score || 0} pts</Badge>
                      </td>
                      <td>
                        <Badge variant={accBadge.variant}>{accBadge.label}</Badge>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {timeAgo(att.completed_at)}
                        </span>
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
  )
}
