import { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  CheckCircle2,
  Swords,
  UserPlus,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { api } from '../../../lib/api'
import { useClass } from '../../../stores/ClassContext'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../../components/ui/EmptyState'
import { formatDate, timeAgo } from '../../../lib/utils'

export function ActivityPage() {
  const { selectedClassId, selectedClass } = useClass()
  const [events, setEvents] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const fetchActivity = useCallback(
    async (cursor = null, isAppend = false) => {
      if (!selectedClassId) {
        setIsLoading(false)
        return
      }
      try {
        if (isAppend) {
          setIsLoadingMore(true)
        } else {
          setIsLoading(true)
          setError(null)
        }

        const data = await api.teacher.getActivity(selectedClassId, {
          limit: 25,
          cursor: cursor || undefined,
          type: eventTypeFilter || undefined,
        })

        const items = data.items || []
        if (isAppend) {
          setEvents((prev) => [...prev, ...items])
        } else {
          setEvents(items)
        }
        setNextCursor(data.next_cursor || null)
      } catch (err) {
        setError(err.message || 'Failed to load activity stream')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [selectedClassId, eventTypeFilter]
  )

  useEffect(() => {
    fetchActivity(null, false)
  }, [fetchActivity])

  const handleLoadMore = () => {
    if (nextCursor && !isLoadingMore) {
      fetchActivity(nextCursor, true)
    }
  }

  const getEventMeta = (type) => {
    switch (type) {
      case 'ATTEMPT_COMPLETED':
        return {
          icon: CheckCircle2,
          color: '#34d399',
          bg: 'rgba(16, 185, 129, 0.15)',
          label: 'Challenge Completed',
          badgeVariant: 'success',
        }
      case 'WON_DUEL':
      case 'DUEL_COMPLETED':
        return {
          icon: Swords,
          color: '#fbbf24',
          bg: 'rgba(245, 158, 11, 0.15)',
          label: 'PvP Duel Won',
          badgeVariant: 'warning',
        }
      case 'JOINED_CLASS':
        return {
          icon: UserPlus,
          color: '#818cf8',
          bg: 'rgba(99, 102, 241, 0.15)',
          label: 'Student Joined',
          badgeVariant: 'primary',
        }
      case 'CREATED_CHALLENGE':
        return {
          icon: Sparkles,
          color: '#c084fc',
          bg: 'rgba(168, 85, 247, 0.15)',
          label: 'AI Challenge Generated',
          badgeVariant: 'purple',
        }
      default:
        return {
          icon: Activity,
          color: '#94a3b8',
          bg: 'rgba(255, 255, 255, 0.08)',
          label: type.replace(/_/g, ' '),
          badgeVariant: 'neutral',
        }
    }
  }

  return (
    <div className="page-container">
      {/* Header & Filter Controls */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Activity className="w-6 h-6 text-indigo-400" />
            Live Activity Stream
          </h1>
          <p className="page-subtitle">
            Real-time feed of challenge submissions, PvP duels, and milestone events in{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{selectedClass?.name || 'Class'}</strong>
          </p>
        </div>

        {/* Event Type Filter */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="select"
            style={{ width: 'auto' }}
          >
            <option value="">All Event Types</option>
            <option value="ATTEMPT_COMPLETED">Challenge Submissions</option>
            <option value="WON_DUEL">PvP Duels</option>
            <option value="JOINED_CLASS">Class Joins</option>
            <option value="CREATED_CHALLENGE">AI Generations</option>
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchActivity(null, false)}
            icon={RefreshCw}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={4} />
      ) : error ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Failed to load activity"
            description={error}
            actionLabel="Retry"
            onAction={() => fetchActivity(null, false)}
          />
        </Card>
      ) : events.length === 0 ? (
        <Card>
          <EmptyState
            icon={Activity}
            title="No activity events recorded"
            description={
              eventTypeFilter
                ? 'No events match the selected type filter.'
                : 'Activity events will appear here as students complete challenges.'
            }
            actionLabel={eventTypeFilter ? 'Clear Filter' : undefined}
            onAction={() => setEventTypeFilter('')}
          />
        </Card>
      ) : (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {events.map((e, idx) => {
              const meta = getEventMeta(e.type)
              const Icon = meta.icon

              let payloadObj
              try {
                payloadObj = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata || {}
              } catch {
                payloadObj = {}
              }

              return (
                <div
                  key={e.id || idx}
                  className="activity-item"
                  style={{
                    padding: '16px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      className="activity-icon-wrapper"
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {meta.label}
                        </span>
                        <Badge variant={meta.badgeVariant} style={{ fontSize: '0.68rem' }}>
                          {e.type}
                        </Badge>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        {e.user_id && (
                          <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>
                            User: <strong style={{ color: 'var(--text-primary)' }}>{e.user_id}</strong>
                          </span>
                        )}
                        {payloadObj.score !== undefined && (
                          <span style={{ color: '#818cf8', fontWeight: '600', marginRight: '8px' }}>
                            +{payloadObj.score} XP
                          </span>
                        )}
                        {payloadObj.attemptId && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Attempt: {payloadObj.attemptId.slice(0, 8)}...
                          </span>
                        )}
                        {payloadObj.winner_id && (
                          <span style={{ color: '#fbbf24', fontWeight: '600' }}>
                            Winner ID: {payloadObj.winner_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                      {timeAgo(e.created_at)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {formatDate(e.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Cursor Pagination Button */}
          {nextCursor && (
            <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <Button
                variant="secondary"
                size="md"
                onClick={handleLoadMore}
                isLoading={isLoadingMore}
              >
                Load Older Activity Events
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
