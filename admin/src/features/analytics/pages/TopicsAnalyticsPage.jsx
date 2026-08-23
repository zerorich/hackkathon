import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen,
  Search,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { api } from '../../../lib/api'
import { useClass } from '../../../stores/ClassContext'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../../components/ui/EmptyState'
import {
  formatPercent,
  getAccuracyBadge,
  getDifficultyBadge,
} from '../../../lib/utils'

export function TopicsAnalyticsPage({ onNavigate }) {
  const { selectedClassId, selectedClass } = useClass()
  const [topics, setTopics] = useState([])
  const [search, setSearch] = useState('')
  const [filterWeakOnly, setFilterWeakOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTopicsAnalytics = useCallback(async () => {
    if (!selectedClassId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.teacher.getTopicsAnalytics(selectedClassId)
      setTopics(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load topic analytics')
    } finally {
      setIsLoading(false)
    }
  }, [selectedClassId])

  useEffect(() => {
    fetchTopicsAnalytics()
  }, [fetchTopicsAnalytics])

  const filteredTopics = topics.filter((t) => {
    const title = t.topic?.title?.toLowerCase() || ''
    const matchesSearch = title.includes(search.toLowerCase())
    const matchesWeak = filterWeakOnly ? t.is_weak : true
    return matchesSearch && matchesWeak
  })

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Topic Analytics & Mastery
          </h1>
          <p className="page-subtitle">
            Curriculum comprehension, average accuracy, and weak topic alerts for{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{selectedClass?.name || 'Class'}</strong>
          </p>
        </div>

        {/* Search & Quick Filters */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search
              className="w-4 h-4 text-gray-400"
              style={{ position: 'absolute', left: '12px', top: '11px' }}
            />
            <input
              type="text"
              placeholder="Search topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: '36px', width: '220px' }}
            />
          </div>

          <Button
            variant={filterWeakOnly ? 'danger' : 'secondary'}
            size="sm"
            onClick={() => setFilterWeakOnly(!filterWeakOnly)}
            icon={AlertTriangle}
          >
            {filterWeakOnly ? 'Showing Weak Only' : 'Filter Weak'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : error ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Failed to load topic analytics"
            description={error}
            actionLabel="Retry"
            onAction={fetchTopicsAnalytics}
          />
        </Card>
      ) : filteredTopics.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No topics match your filter"
            description={search ? `No topics matching "${search}"` : 'No topic analytics records available.'}
            actionLabel={search || filterWeakOnly ? 'Clear Filters' : undefined}
            onAction={() => {
              setSearch('')
              setFilterWeakOnly(false)
            }}
          />
        </Card>
      ) : (
        <Card>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Difficulty</th>
                  <th>Participants</th>
                  <th>Total Attempts</th>
                  <th>Avg Accuracy</th>
                  <th>Mastery Score</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopics.map((row) => {
                  const topic = row.topic || {}
                  const diffBadge = getDifficultyBadge(topic.difficulty)
                  const accBadge = getAccuracyBadge(row.average_accuracy)
                  const mastery = Number(row.mastery_average) || 0

                  return (
                    <tr
                      key={topic.id}
                      style={{
                        backgroundColor: row.is_weak ? 'rgba(244, 63, 94, 0.04)' : undefined,
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: row.is_weak
                                ? 'var(--danger-light)'
                                : 'var(--primary-light)',
                              color: row.is_weak ? 'var(--danger)' : 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {topic.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              ID: {topic.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <Badge variant={diffBadge.variant}>{diffBadge.label}</Badge>
                      </td>

                      <td>
                        <span style={{ fontWeight: '600' }}>{row.unique_participants}</span>
                      </td>

                      <td>
                        <span style={{ color: 'var(--text-secondary)' }}>{row.attempts_count}</span>
                      </td>

                      <td>
                        <Badge variant={accBadge.variant}>{accBadge.label}</Badge>
                      </td>

                      <td style={{ minWidth: '130px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-bar-bg" style={{ flex: 1 }}>
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${Math.min(100, Math.max(0, mastery))}%`,
                                backgroundColor:
                                  mastery >= 75 ? 'var(--success)' : mastery >= 50 ? 'var(--warning)' : 'var(--danger)',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: '700' }}>
                            {formatPercent(mastery, 0)}
                          </span>
                        </div>
                      </td>

                      <td>
                        {row.is_weak ? (
                          <Badge variant="danger" icon={AlertTriangle}>
                            Needs Attention
                          </Badge>
                        ) : (
                          <Badge variant="success">On Track</Badge>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigate(`analytics-topic-${topic.id}`)}
                          icon={ChevronRight}
                        >
                          Deep Dive
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
