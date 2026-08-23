import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  Search,
  UserCheck,
  UserX,
  Users,
  GraduationCap,
  Sparkles,
  Lock,
  Unlock,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Table, TableRow, TableCell } from '../../components/ui/Table'
import { TableSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { api } from '../../lib/api'

export function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Block / Unblock status modal
  const [userToToggle, setUserToToggle] = useState(null)
  const [isToggling, setIsToggling] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [usersRes, overviewRes] = await Promise.all([
        api.admin.getUsers({
          role: roleFilter || undefined,
          status: statusFilter || undefined,
          search: search.trim() || undefined,
        }),
        api.admin.getOverview().catch(() => null),
      ])

      const list = Array.isArray(usersRes) ? usersRes : []
      setUsers(list)
      if (overviewRes) setOverview(overviewRes)
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [roleFilter, statusFilter, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleConfirmToggle = async () => {
    if (!userToToggle) return
    try {
      setIsToggling(true)
      const targetUser = userToToggle.user || userToToggle
      const nextStatus = targetUser.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
      await api.admin.updateUserStatus(targetUser.id, nextStatus)
      setUserToToggle(null)
      await fetchData()
    } catch (err) {
      alert(`Failed to update user status: ${err.message}`)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck className="w-6 h-6 text-purple-400" />
            System User Management & Access Control
          </h1>
          <p className="page-subtitle">
            Admin console: supervise all enrolled students, teachers, active sessions, and account statuses
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <Card style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
              Total Accounts
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginTop: '4px' }}>
              {overview.total_users || 0}
            </div>
          </Card>

          <Card style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
              Students
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#818cf8', marginTop: '4px' }}>
              {overview.total_students || 0}
            </div>
          </Card>

          <Card style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
              Teachers
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#06b6d4', marginTop: '4px' }}>
              {overview.total_teachers || 0}
            </div>
          </Card>

          <Card style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
              Active Classes
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
              {overview.total_classes || 0}
            </div>
          </Card>

          <Card style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
              AI Generations
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#c084fc', marginTop: '4px' }}>
              {overview.ai_generations || 0}
            </div>
          </Card>
        </div>
      )}

      {/* Filter Controls */}
      <Card style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
          <Input
            icon={Search}
            placeholder="Search by name, email, or student identifier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: '', label: 'All User Roles' },
              { value: 'STUDENT', label: 'Students' },
              { value: 'TEACHER', label: 'Teachers' },
              { value: 'ADMIN', label: 'Administrators' },
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active Accounts' },
              { value: 'BLOCKED', label: 'Blocked Accounts' },
            ]}
          />
        </div>
      </Card>

      {/* Users Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : users.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No Users Found"
            description="No users match the search criteria."
          />
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Table
            headers={[
              { label: 'User Account' },
              { label: 'System Role' },
              { label: 'Account Status' },
              { label: 'Onboarding' },
              { label: 'Created At' },
              { label: 'Actions', style: { textAlign: 'right' } },
            ]}
          >
            {users.map((row, idx) => {
              const u = row.user || row
              const isBlocked = u.status === 'BLOCKED'
              return (
                <TableRow key={u.id || idx}>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor:
                            u.role === 'ADMIN'
                              ? 'rgba(168, 85, 247, 0.2)'
                              : u.role === 'TEACHER'
                              ? 'rgba(6, 182, 212, 0.2)'
                              : 'rgba(99, 102, 241, 0.2)',
                          color:
                            u.role === 'ADMIN'
                              ? '#c084fc'
                              : u.role === 'TEACHER'
                              ? '#22d3ee'
                              : '#818cf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                        }}
                      >
                        {u.display_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {u.display_name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {u.identifier}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        u.role === 'ADMIN'
                          ? 'purple'
                          : u.role === 'TEACHER'
                          ? 'primary'
                          : 'neutral'
                      }
                    >
                      {u.role}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant={isBlocked ? 'danger' : 'success'}>
                      {isBlocked ? 'BLOCKED' : 'ACTIVE'}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span style={{ fontSize: '0.82rem', color: u.onboarding_completed ? '#34d399' : 'var(--text-muted)' }}>
                      {u.onboarding_completed ? 'Completed' : 'Pending'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                    </span>
                  </TableCell>

                  <TableCell style={{ textAlign: 'right' }}>
                    <Button
                      variant={isBlocked ? 'secondary' : 'danger'}
                      size="sm"
                      icon={isBlocked ? Unlock : Lock}
                      onClick={() => setUserToToggle(row)}
                      style={{ fontSize: '0.78rem' }}
                    >
                      {isBlocked ? 'Unblock' : 'Block User'}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </Table>
        </Card>
      )}

      {/* Confirm Block / Unblock Modal */}
      <ConfirmModal
        isOpen={!!userToToggle}
        onClose={() => setUserToToggle(null)}
        onConfirm={handleConfirmToggle}
        title={
          (userToToggle?.user || userToToggle)?.status === 'ACTIVE'
            ? 'Block User Account'
            : 'Unblock User Account'
        }
        description={
          (userToToggle?.user || userToToggle)?.status === 'ACTIVE'
            ? `Are you sure you want to block ${(userToToggle?.user || userToToggle)?.display_name}? They will be immediately denied access to the system.`
            : `Are you sure you want to restore access for ${(userToToggle?.user || userToToggle)?.display_name}?`
        }
        confirmText={
          (userToToggle?.user || userToToggle)?.status === 'ACTIVE'
            ? 'Block Account'
            : 'Unblock Account'
        }
        variant={
          (userToToggle?.user || userToToggle)?.status === 'ACTIVE' ? 'danger' : 'primary'
        }
        isLoading={isToggling}
      />
    </div>
  )
}
