import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  Calendar,
  Zap,
  Swords,
  Users,
  CheckCircle2,
  Percent,
  TrendingUp,
  AlertTriangle,
  Award,
} from 'lucide-react'
import { api } from '../../../lib/api'
import { useClass } from '../../../stores/ClassContext'
import { StatCard } from '../../../components/ui/StatCard'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { StatsGridSkeleton, TableSkeleton } from '../../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../../components/ui/EmptyState'
import { formatNumber, formatPercent, getAccuracyBadge } from '../../../lib/utils'

export function AnalyticsOverviewPage({ onNavigate }) {
  const { selectedClassId, selectedClass } = useClass()
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Date Filter State
  const [periodPreset, setPeriodPreset] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const handlePresetChange = (preset) => {
    setPeriodPreset(preset)
    const now = new Date()
    if (preset === 'all') {
      setFromDate('')
      setToDate('')
    } else if (preset === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      setFromDate(startOfDay.toISOString())
      setToDate(now.toISOString())
    } else if (preset === '7d') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      setFromDate(past7.toISOString())
      setToDate(now.toISOString())
    } else if (preset === '30d') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      setFromDate(past30.toISOString())
      setToDate(now.toISOString())
    }
  }

  const fetchOverview = useCallback(async () => {
    if (!selectedClassId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const res = await api.teacher.getOverview(selectedClassId, {
        from: fromDate || undefined,
        to: toDate || undefined,
      })
      setData(res)
    } catch (err) {
      setError(err.message || 'Failed to load report overview')
    } finally {
      setIsLoading(false)
    }
  }, [selectedClassId, fromDate, toDate])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  if (!selectedClassId) {
    return (
      <div className="page-container">
        <EmptyState
          title="No Class Selected"
          description="Please select a class to view report analytics."
        />
      </div>
    )
  }

  const {
    active_students = 0,
    attempts = 0,
    completed_challenges = 0,
    avg_accuracy = 0,
    xp_earned = 0,
    duels_created = 0,
    duels_completed = 0,
    top_topics = [],
    weak_topics = [],
  } = data || {}

  return (
    <div className="page-container">
      {/* Header & Date Range Filter Bar */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Class Performance Reports
          </h1>
          <p className="page-subtitle">
            Aggregated period reports and learning analytics for{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{selectedClass?.name || 'Class'}</strong>
          </p>
        </div>

        {/* Date Filter Presets */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(18, 24, 38, 0.9)',
            padding: '6px',
            borderRadius: '12px',
            border: '1px solid var(--border-card)',
            flexWrap: 'wrap',
          }}
        >
          <Calendar className="w-4 h-4 text-slate-400" style={{ marginLeft: '6px' }} />
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p.id)}
              className="btn btn-sm"
              style={{
                background: periodPreset === p.id ? 'var(--primary)' : 'transparent',
                color: periodPreset === p.id ? '#fff' : 'var(--text-secondary)',
                border: 'none',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <>
          <StatsGridSkeleton count={6} />
          <div className="grid-2col">
            <TableSkeleton rows={4} cols={3} />
            <TableSkeleton rows={4} cols={3} />
          </div>
        </>
      ) : error ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Failed to load reports"
            description={error}
            actionLabel="Retry"
            onAction={fetchOverview}
          />
        </Card>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="stats-grid">
            <StatCard
              title="Active Students"
              value={formatNumber(active_students)}
              icon={Users}
              color="primary"
              subtitle="Engaged in selected period"
            />
            <StatCard
              title="Total XP Earned"
              value={formatNumber(xp_earned)}
              icon={Zap}
              color="purple"
              subtitle="Points gained by class"
            />
            <StatCard
              title="Completed Challenges"
              value={formatNumber(completed_challenges)}
              icon={CheckCircle2}
              color="cyan"
              subtitle={`${formatNumber(attempts)} total attempts`}
            />
            <StatCard
              title="Average Accuracy"
              value={formatPercent(avg_accuracy)}
              icon={Percent}
              color={avg_accuracy >= 70 ? 'success' : avg_accuracy >= 50 ? 'warning' : 'danger'}
              subtitle="Class wide accuracy"
            />
            <StatCard
              title="Duels Created"
              value={formatNumber(duels_created)}
              icon={Swords}
              color="warning"
              subtitle="PvP matches initiated"
            />
            <StatCard
              title="Duels Completed"
              value={formatNumber(duels_completed)}
              icon={Award}
              color="success"
              subtitle={
                duels_created > 0
                  ? `${Math.round((duels_completed / duels_created) * 100)}% completion rate`
                  : 'No duels'
              }
            />
          </div>

          {/* Comparative Breakdown: Top Topics vs Weak Topics */}
          <div className="grid-2col">
            {/* Top Performing Topics */}
            <Card
              title="Top Performing Topics"
              subtitle="Highest student accuracy rate"
              icon={TrendingUp}
              actions={<Badge variant="success">Mastered</Badge>}
            >
              {top_topics.length === 0 ? (
                <EmptyState title="No Topics Data" description="No completed topic attempts found." />
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Topic</th>
                        <th>Average Accuracy</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top_topics.map((t) => {
                        const accBadge = getAccuracyBadge(t.average_accuracy)
                        return (
                          <tr
                            key={t.topic_id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => onNavigate(`analytics-topic-${t.topic_id}`)}
                          >
                            <td>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                {t.title}
                              </div>
                            </td>
                            <td>
                              <Badge variant={accBadge.variant}>{accBadge.label}</Badge>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '600' }}>
                                ✓ Strong Understanding
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

            {/* Weak Topics Needing Attention */}
            <Card
              title="Weak Topics (Below 60%)"
              subtitle="Topics requiring teacher review and reinforcement"
              icon={AlertTriangle}
              actions={<Badge variant="danger">Needs Attention</Badge>}
            >
              {weak_topics.length === 0 ? (
                <div style={{ padding: '30px 0', textAlign: 'center' }}>
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    No Weak Topics in this Period!
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Class performance meets the target threshold.
                  </div>
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Weak Topic</th>
                        <th>Average Accuracy</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weak_topics.map((t) => (
                        <tr
                          key={t.topic_id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => onNavigate(`analytics-topic-${t.topic_id}`)}
                        >
                          <td>
                            <div style={{ fontWeight: '600', color: '#fb7185' }}>
                              ⚠️ {t.title}
                            </div>
                          </td>
                          <td>
                            <Badge variant="danger">{formatPercent(t.average_accuracy)}</Badge>
                          </td>
                          <td>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onNavigate(`analytics-topic-${t.topic_id}`)
                              }}
                            >
                              Deep Dive →
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
