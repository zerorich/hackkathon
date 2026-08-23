import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Search,
  ChevronRight,
  AlertTriangle,
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
  timeAgo,
  getAccuracyBadge,
} from '../../../lib/utils'

export function StudentsAnalyticsPage({ onNavigate }) {
  const { selectedClassId, selectedClass } = useClass()
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('xp')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStudents = useCallback(async () => {
    if (!selectedClassId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.teacher.getStudents(selectedClassId)
      setStudents(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load students analytics')
    } finally {
      setIsLoading(false)
    }
  }, [selectedClassId])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const filteredStudents = students
    .filter((st) => {
      const name = st.user?.display_name?.toLowerCase() || ''
      const email = st.user?.identifier?.toLowerCase() || ''
      const q = search.toLowerCase()
      return name.includes(q) || email.includes(q)
    })
    .sort((a, b) => {
      if (sortBy === 'xp') return (b.total_xp || 0) - (a.total_xp || 0)
      if (sortBy === 'accuracy') return (b.average_accuracy || 0) - (a.average_accuracy || 0)
      if (sortBy === 'streak') return (b.streak || 0) - (a.streak || 0)
      if (sortBy === 'challenges') return (b.completed_challenges || 0) - (a.completed_challenges || 0)
      return 0
    })

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Users className="w-6 h-6 text-indigo-400" />
            Students Roster & Performance
          </h1>
          <p className="page-subtitle">
            Individual student metrics, streaks, XP, and duel stats in{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{selectedClass?.name || 'Class'}</strong>
          </p>
        </div>

        {/* Search & Sort */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search
              className="w-4 h-4 text-slate-400"
              style={{ position: 'absolute', left: '12px', top: '11px' }}
            />
            <input
              type="text"
              placeholder="Search student name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: '36px', width: '250px' }}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="select"
            style={{ width: 'auto' }}
          >
            <option value="xp">Sort by Total XP</option>
            <option value="accuracy">Sort by Accuracy %</option>
            <option value="streak">Sort by Streak</option>
            <option value="challenges">Sort by Completed</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : error ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Failed to load students"
            description={error}
            actionLabel="Retry"
            onAction={fetchStudents}
          />
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No students found"
            description={search ? `No student matching "${search}"` : 'No student records in this class.'}
            actionLabel={search ? 'Clear Search' : undefined}
            onAction={() => setSearch('')}
          />
        </Card>
      ) : (
        <Card>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Level</th>
                  <th>Total XP</th>
                  <th>Streak</th>
                  <th>Accuracy</th>
                  <th>Completed</th>
                  <th>Duel Wins</th>
                  <th>Last Activity</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st) => {
                  const user = st.user || {}
                  const accBadge = getAccuracyBadge(st.average_accuracy)

                  return (
                    <tr
                      key={user.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onNavigate(`analytics-student-${user.id}`)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(99, 102, 241, 0.2)',
                              border: '1px solid rgba(99, 102, 241, 0.4)',
                              color: '#818cf8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {user.display_name || 'Unnamed Student'}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {user.identifier}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <Badge variant="primary">Lvl {st.level || 1}</Badge>
                      </td>

                      <td>
                        <span style={{ fontWeight: '700', color: '#c084fc' }}>
                          {formatNumber(st.total_xp)} XP
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: '600' }}>
                          🔥 {st.streak || 0}d
                        </span>
                      </td>

                      <td>
                        <Badge variant={accBadge.variant}>{accBadge.label}</Badge>
                      </td>

                      <td>
                        <span style={{ fontWeight: '600' }}>{st.completed_challenges || 0}</span>
                      </td>

                      <td>
                        <span style={{ color: '#22d3ee', fontWeight: '600' }}>
                          ⚔️ {st.duel_wins || 0}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {timeAgo(st.last_activity_at)}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onNavigate(`analytics-student-${user.id}`)
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
      )}
    </div>
  )
}
