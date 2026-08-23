import { useState } from 'react'
import { GraduationCap, Copy, Check, Plus, ArrowRight, Users, BookOpen } from 'lucide-react'
import { useClass } from '../../stores/ClassContext'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input, Textarea } from '../../components/ui/Input'
import { TableSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { api } from '../../lib/api'

export function ClassesPage({ onNavigate }) {
  const { classes, selectedClassId, selectClass, loadingClasses, refreshClasses } = useClass()
  const [copiedId, setCopiedId] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createdClassResult, setCreatedClassResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    description: '',
  })

  const handleCopyInvite = (inviteCode, classId) => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode)
      setCopiedId(classId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleOpenCreate = () => {
    setFormData({ name: '', grade: '', description: '' })
    setFormError(null)
    setCreatedClassResult(null)
    setIsCreateOpen(true)
  }

  const handleCreateClass = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormError('Class name is required')
      return
    }
    if (!formData.grade.trim()) {
      setFormError('Grade level is required (e.g. 9, 10-A)')
      return
    }

    try {
      setSubmitting(true)
      setFormError(null)
      const res = await api.classes.create({
        name: formData.name.trim(),
        grade: formData.grade.trim(),
        description: formData.description.trim() || undefined,
      })
      setCreatedClassResult(res)
      await refreshClasses()
    } catch (err) {
      setFormError(err.message || 'Failed to create class')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GraduationCap className="w-6 h-6 text-blue-600" />
            Class Management & Rosters
          </h1>
          <p className="page-subtitle">
            Manage student classrooms, generate invite codes, curriculum subjects, and assessments
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
          Create New Class
        </Button>
      </div>

      {/* Class List */}
      {loadingClasses ? (
        <TableSkeleton rows={4} cols={4} />
      ) : classes.length === 0 ? (
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="No Classes Found"
            description="Create your first classroom to invite students and configure subjects."
            action={
              <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
                Create Classroom Now
              </Button>
            }
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {classes.map((cls) => {
            const isSelected = cls.id === selectedClassId
            const isCopied = copiedId === cls.id

            return (
              <Card
                key={cls.id}
                style={{
                  border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-card)',
                  boxShadow: isSelected ? '0 0 20px -5px rgba(37, 99, 235, 0.15)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  {/* Top Bar of Card */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(37, 99, 235, 0.15)',
                        }}
                      >
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                          {cls.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <Badge variant="neutral" style={{ fontSize: '0.7rem' }}>
                            Grade {cls.grade || '—'}
                          </Badge>
                          <Badge variant="success" style={{ fontSize: '0.7rem' }}>
                            {cls.status || 'ACTIVE'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <Badge variant="primary">Active</Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => selectClass(cls.id)}
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      >
                        Select
                      </Button>
                    )}
                  </div>

                  {cls.description && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                      {cls.description}
                    </p>
                  )}

                  {/* Invite Code Box */}
                  <div
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      marginBottom: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Student Invite Code
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '1.05rem', color: '#38bdf8' }}>
                        {cls.invite_code || '—'}
                      </div>
                    </div>

                    {cls.invite_code && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyInvite(cls.invite_code, cls.id)}
                        icon={isCopied ? Check : Copy}
                        style={{ color: isCopied ? 'var(--success)' : undefined }}
                      >
                        {isCopied ? 'Copied' : 'Copy'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={ArrowRight}
                    onClick={() => {
                      selectClass(cls.id)
                      onNavigate(`class-detail-${cls.id}`)
                    }}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Manage Class Roster & Subjects
                  </Button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={BookOpen}
                      onClick={() => {
                        selectClass(cls.id)
                        onNavigate('subjects')
                      }}
                      style={{ fontSize: '0.78rem' }}
                    >
                      Subjects
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Users}
                      onClick={() => {
                        selectClass(cls.id)
                        onNavigate('dashboard')
                      }}
                      style={{ fontSize: '0.78rem' }}
                    >
                      Analytics →
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Class Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={createdClassResult ? 'Class Created Successfully!' : 'Create New Class'}
        subtitle={
          createdClassResult
            ? 'Share the invitation code with students so they can join.'
            : 'Enter classroom details to generate a student enrollment code.'
        }
        icon={GraduationCap}
        footer={
          createdClassResult ? (
            <Button
              variant="primary"
              onClick={() => {
                setIsCreateOpen(false)
                if (createdClassResult.id) {
                  selectClass(createdClassResult.id)
                  onNavigate(`class-detail-${createdClassResult.id}`)
                }
              }}
            >
              Go to Class Details →
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCreateClass} loading={submitting}>
                Create Class
              </Button>
            </>
          )
        }
      >
        {createdClassResult ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--success-light)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Check className="w-8 h-8" />
            </div>

            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
              {createdClassResult.name} (Grade {createdClassResult.grade})
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Students can use the code below in the Student Portal to enroll immediately.
            </p>

            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.06)',
                border: '1.5px dashed rgba(37, 99, 235, 0.25)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.6rem',
                  fontWeight: '800',
                  color: '#38bdf8',
                  letterSpacing: '0.1em',
                }}
              >
                {createdClassResult.invite_code}
              </span>
              <Button
                variant="secondary"
                size="sm"
                icon={copiedId === createdClassResult.id ? Check : Copy}
                onClick={() => handleCopyInvite(createdClassResult.invite_code, createdClassResult.id)}
              >
                {copiedId === createdClassResult.id ? 'Copied!' : 'Copy Code'}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateClass}>
            {formError && (
              <div
                style={{
                  backgroundColor: 'var(--danger-light)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--danger)',
                  fontSize: '0.84rem',
                  marginBottom: '16px',
                }}
              >
                {formError}
              </div>
            )}

            <Input
              label="Class Name"
              placeholder="e.g. 9-A Algebra or 11-B Computer Science"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
            />

            <Input
              label="Grade Level"
              placeholder="e.g. 9, 10, or 11"
              required
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            />

            <Textarea
              label="Description (Optional)"
              placeholder="Short description or curriculum goals for this class"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </form>
        )}
      </Modal>
    </div>
  )
}
