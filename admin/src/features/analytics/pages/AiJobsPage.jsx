import { useState, useEffect, useCallback } from 'react'
import {
  Cpu,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Users,
  CheckCircle2,
  Swords,
  Server,
} from 'lucide-react'
import { api } from '../../../lib/api'
import { StatCard } from '../../../components/ui/StatCard'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { TableSkeleton } from '../../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../../components/ui/EmptyState'
import { formatNumber, timeAgo } from '../../../lib/utils'

export function AiJobsPage() {
  const [overview, setOverview] = useState(null)
  const [jobs, setJobs] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [retryingJobId, setRetryingJobId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [ovRes, jobsRes] = await Promise.allSettled([
        api.admin.getOverview(),
        api.admin.getAiJobs({ status: statusFilter || undefined }),
      ])

      if (ovRes.status === 'fulfilled') {
        setOverview(ovRes.value)
      }
      if (jobsRes.status === 'fulfilled') {
        setJobs(Array.isArray(jobsRes.value) ? jobsRes.value : [])
      }
    } catch (err) {
      setError(err.message || 'Failed to load AI job queue')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRetryJob = async (jobId) => {
    try {
      setRetryingJobId(jobId)
      await api.admin.retryAiJob(jobId)
      await fetchData()
    } catch (err) {
      alert(`Failed to retry job: ${err.message}`)
    } finally {
      setRetryingJobId(null)
    }
  }

  const {
    total_users = 0,
    total_students = 0,
    total_teachers = 0,
    total_classes = 0,
    total_attempts = 0,
    ai_generations = 0,
    ai_failures = 0,
    duels = 0,
  } = overview || {}

  const getJobStatusBadge = (st) => {
    switch (String(st).toUpperCase()) {
      case 'COMPLETED':
      case 'READY':
        return { variant: 'success', label: 'Completed' }
      case 'FAILED':
        return { variant: 'danger', label: 'Failed' }
      case 'RUNNING':
        return { variant: 'cyan', label: 'Running' }
      case 'PENDING':
      default:
        return { variant: 'warning', label: 'Pending' }
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Cpu className="w-6 h-6 text-indigo-400" />
            AI Orchestration & Platform Monitoring
          </h1>
          <p className="page-subtitle">
            System overview, AI question generation jobs, and pipeline health
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchData}
          icon={RefreshCw}
          disabled={isLoading}
        >
          Refresh Queue
        </Button>
      </div>

      {/* Platform Overview KPI Grid */}
      {overview && (
        <div className="stats-grid">
          <StatCard
            title="Total Users"
            value={formatNumber(total_users)}
            icon={Users}
            color="primary"
            subtitle={`${total_teachers} teachers, ${total_students} students`}
          />
          <StatCard
            title="Total Classes"
            value={formatNumber(total_classes)}
            icon={Server}
            color="cyan"
            subtitle="Active school classes"
          />
          <StatCard
            title="AI Generations"
            value={formatNumber(ai_generations)}
            icon={Sparkles}
            color="purple"
            subtitle={`${ai_failures} failure records`}
          />
          <StatCard
            title="Total Submissions"
            value={formatNumber(total_attempts)}
            icon={CheckCircle2}
            color="success"
            subtitle="Evaluated attempts"
          />
          <StatCard
            title="Duels Held"
            value={formatNumber(duels)}
            icon={Swords}
            color="warning"
            subtitle="Student PvP matches"
          />
        </div>
      )}

      {/* Filter and AI Jobs Queue */}
      <Card
        title="AI Challenge Generation Queue"
        subtitle="Asynchronous background pipeline tasks"
        icon={Cpu}
        actions={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select"
            style={{ width: 'auto' }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="RUNNING">Running</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        }
      >
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Failed to load job queue"
            description={error}
            actionLabel="Retry"
            onAction={fetchData}
          />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Cpu}
            title="No AI jobs found"
            description="The AI generation queue is currently clear."
          />
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Challenge ID</th>
                  <th>Status</th>
                  <th>Error / Diagnostic</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const stBadge = getJobStatusBadge(j.status)
                  const isRetrying = retryingJobId === j.id

                  return (
                    <tr key={j.id}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {j.id.slice(0, 10)}...
                        </span>
                      </td>

                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                          {j.challenge_id || '—'}
                        </span>
                      </td>

                      <td>
                        <Badge variant={stBadge.variant}>{stBadge.label}</Badge>
                      </td>

                      <td>
                        {j.error_message ? (
                          <span style={{ color: '#fb7185', fontSize: '0.78rem' }}>
                            {j.error_message}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None</span>
                        )}
                      </td>

                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {timeAgo(j.created_at)}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {j.status === 'FAILED' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRetryJob(j.id)}
                            isLoading={isRetrying}
                            icon={RotateCcw}
                          >
                            Retry
                          </Button>
                        )}
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
