import { useState } from 'react'
import { GraduationCap, Copy, Check } from 'lucide-react'
import { useClass } from '../../stores/ClassContext'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { TableSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'

export function ClassesPage({ onNavigate }) {
  const { classes, selectedClassId, selectClass, loadingClasses } = useClass()
  const [copiedId, setCopiedId] = useState(null)

  const handleCopyInvite = (inviteCode, classId) => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode)
      setCopiedId(classId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <GraduationCap className="w-6 h-6 text-indigo-400" />
            Class Management & Roster
          </h1>
          <p className="page-subtitle">Manage classroom invite codes, grade levels, and student memberships</p>
        </div>
      </div>

      {loadingClasses ? (
        <TableSkeleton rows={4} cols={5} />
      ) : classes.length === 0 ? (
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="No Classes Configured"
            description="Create a class or contact the school administrator to get started."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {classes.map((cls) => {
            const isSelected = cls.id === selectedClassId
            const isCopied = copiedId === cls.id

            return (
              <Card
                key={cls.id}
                style={{
                  border: isSelected ? '1.5px solid #6366f1' : '1px solid var(--border-card)',
                  boxShadow: isSelected ? '0 0 20px -5px rgba(99, 102, 241, 0.3)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        color: '#818cf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {cls.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Grade {cls.grade || '—'}
                      </div>
                    </div>
                  </div>

                  {isSelected ? (
                    <Badge variant="primary">Active Selection</Badge>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => selectClass(cls.id)}>
                      Select
                    </Button>
                  )}
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Student Invite Code
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '1rem', color: '#38bdf8' }}>
                      {cls.invite_code || '—'}
                    </div>
                  </div>

                  {cls.invite_code && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopyInvite(cls.invite_code, cls.id)}
                      icon={isCopied ? Check : Copy}
                    >
                      {isCopied ? 'Copied' : 'Copy'}
                    </Button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    style={{ flex: 1 }}
                    onClick={() => {
                      selectClass(cls.id)
                      onNavigate('dashboard')
                    }}
                  >
                    Open Dashboard →
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      selectClass(cls.id)
                      onNavigate('analytics-students')
                    }}
                  >
                    Students
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
