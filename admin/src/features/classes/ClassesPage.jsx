import { useState, useEffect } from 'react'
import {
  GraduationCap,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Layers,
  BookOpen,
  Users,
  AlertCircle,
  FolderKanban,
  CheckCircle2,
  FilePlus2,
  BarChart2,
  RefreshCw,
} from 'lucide-react'
import { useClass } from '../../stores/ClassContext'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { TableSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { api } from '../../lib/api'

export function ClassesPage({ onNavigate, initialTab = 'classes' }) {
  const { classes, selectedClassId, selectClass, loadingClasses, refreshClasses } = useClass()
  const [activeTab, setActiveTab] = useState(
    initialTab === 'subjects' ? 'subjects' : initialTab === 'challenges' ? 'challenges' : 'classes'
  )
  const [copiedId, setCopiedId] = useState(null)

  // Modals
  const [showCreateClassModal, setShowCreateClassModal] = useState(false)
  const [newClassData, setNewClassData] = useState({ name: '', grade: '9', description: '' })
  const [createdInviteCode, setCreatedInviteCode] = useState(null)

  // Students state
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Subjects & Topics state
  const [subjects, setSubjects] = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [topics, setTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)

  // Modals for Subject/Topic
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [subjectForm, setSubjectForm] = useState({ id: null, name: '', description: '' })
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [topicForm, setTopicForm] = useState({
    id: null,
    title: '',
    description: '',
    difficulty: 'MEDIUM',
    source_context: '',
  })

  // Challenges state
  const [selectedTopicId, setSelectedTopicId] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [loadingChallenges, setLoadingChallenges] = useState(false)
  const [showAiGenModal, setShowAiGenModal] = useState(false)
  const [aiGenDifficulty, setAiGenDifficulty] = useState('MEDIUM')
  const [showManualModal, setShowManualModal] = useState(false)
  const [manualForm, setManualForm] = useState({
    title: '',
    difficulty: 'MEDIUM',
    questions: [
      {
        prompt: '',
        explanation: '',
        options: [
          { text: '', is_correct: true },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
        ],
      },
    ],
  })

  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch class members
  const fetchMembers = async () => {
    if (!selectedClassId) return
    setLoadingMembers(true)
    try {
      const res = await api.get(`/classes/${selectedClassId}/members`)
      setMembers(res || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMembers(false)
    }
  }

  // Fetch subjects
  const fetchSubjects = async () => {
    if (!selectedClassId) return
    setLoadingSubjects(true)
    try {
      const res = await api.get(`/classes/${selectedClassId}/subjects`)
      setSubjects(res || [])
      if (res && res.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(res[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSubjects(false)
    }
  }

  // Fetch topics
  const fetchTopics = async (subjId) => {
    const sId = subjId || selectedSubjectId
    if (!sId) return
    setLoadingTopics(true)
    try {
      const res = await api.get(`/subjects/${sId}/topics`)
      setTopics(res || [])
      if (res && res.length > 0 && !selectedTopicId) {
        setSelectedTopicId(res[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingTopics(false)
    }
  }

  // Fetch challenges
  const fetchChallenges = async (tId) => {
    const topId = tId || selectedTopicId
    if (!topId) return
    setLoadingChallenges(true)
    try {
      const res = await api.get(`/topics/${topId}/challenges`)
      setChallenges(res || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingChallenges(false)
    }
  }

  useEffect(() => {
    if (selectedClassId) {
      fetchMembers()
      fetchSubjects()
    }
  }, [selectedClassId])

  useEffect(() => {
    if (selectedSubjectId) {
      fetchTopics(selectedSubjectId)
    }
  }, [selectedSubjectId])

  useEffect(() => {
    if (selectedTopicId) {
      fetchChallenges(selectedTopicId)
    }
  }, [selectedTopicId])

  const handleCopyInvite = (inviteCode, classId) => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode)
      setCopiedId(classId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleCreateClass = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setActionError(null)
    try {
      const res = await api.post('/classes', newClassData)
      setCreatedInviteCode(res.invite_code)
      await refreshClasses()
      selectClass(res.id)
      setActionSuccess(`Class "${res.name}" created successfully!`)
    } catch (err) {
      setActionError(err.message || 'Failed to create class')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveMember = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove ${userName || 'this student'} from the class?`)) {
      return
    }
    try {
      await api.delete(`/classes/${selectedClassId}/members/${userId}`)
      fetchMembers()
      setActionSuccess('Student removed successfully')
    } catch (err) {
      setActionError(err.message || 'Failed to remove student')
    }
  }

  const handleSaveSubject = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setActionError(null)
    try {
      if (subjectForm.id) {
        await api.patch(`/subjects/${subjectForm.id}`, {
          name: subjectForm.name,
          description: subjectForm.description,
        })
      } else {
        await api.post(`/classes/${selectedClassId}/subjects`, {
          name: subjectForm.name,
          description: subjectForm.description,
        })
      }
      setShowSubjectModal(false)
      fetchSubjects()
      setActionSuccess('Subject saved successfully')
    } catch (err) {
      setActionError(err.message || 'Failed to save subject')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchiveSubject = async (subjectId) => {
    if (!window.confirm('Archive this subject and all its topics?')) return
    try {
      await api.delete(`/subjects/${subjectId}`)
      fetchSubjects()
      setActionSuccess('Subject archived')
    } catch (err) {
      setActionError(err.message || 'Failed to archive subject')
    }
  }

  const handleSaveTopic = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setActionError(null)
    try {
      if (topicForm.id) {
        await api.patch(`/topics/${topicForm.id}`, {
          title: topicForm.title,
          description: topicForm.description,
          difficulty: topicForm.difficulty,
          source_context: topicForm.source_context,
        })
      } else {
        await api.post(`/subjects/${selectedSubjectId}/topics`, {
          title: topicForm.title,
          description: topicForm.description,
          difficulty: topicForm.difficulty,
          source_context: topicForm.source_context,
        })
      }
      setShowTopicModal(false)
      fetchTopics()
      setActionSuccess('Topic saved successfully')
    } catch (err) {
      setActionError(err.message || 'Failed to save topic')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchiveTopic = async (topicId) => {
    if (!window.confirm('Archive this topic?')) return
    try {
      await api.delete(`/topics/${topicId}`)
      fetchTopics()
      setActionSuccess('Topic archived')
    } catch (err) {
      setActionError(err.message || 'Failed to archive topic')
    }
  }

  const handleGenerateAiChallenge = async () => {
    if (!selectedTopicId) return
    setIsSubmitting(true)
    setActionError(null)
    try {
      await api.post(`/topics/${selectedTopicId}/challenges/generate`, {
        difficulty: aiGenDifficulty,
        question_count: 5,
      })
      setShowAiGenModal(false)
      setActionSuccess('AI Challenge generation queued! Check status below.')
      setTimeout(() => fetchChallenges(selectedTopicId), 2000)
    } catch (err) {
      setActionError(err.message || 'Failed to trigger AI generation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateManualChallenge = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setActionError(null)
    try {
      await api.post(`/topics/${selectedTopicId}/challenges`, manualForm)
      setShowManualModal(false)
      fetchChallenges(selectedTopicId)
      setActionSuccess('Manual challenge created successfully!')
    } catch (err) {
      setActionError(err.message || 'Failed to create challenge')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleChallengeStatus = async (challengeId, currentStatus) => {
    const nextStatus = currentStatus === 'READY' ? 'ARCHIVED' : 'READY'
    try {
      await api.patch(`/challenges/${challengeId}/status`, { status: nextStatus })
      fetchChallenges(selectedTopicId)
      setActionSuccess(`Challenge status updated to ${nextStatus}`)
    } catch (err) {
      setActionError(err.message || 'Failed to update challenge status')
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <GraduationCap className="w-6 h-6 text-indigo-400" />
            Class Management & Curriculum
          </h1>
          <p className="page-subtitle">
            Configure classrooms, manage student rosters, design curriculum, and generate challenges
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setNewClassData({ name: '', grade: '9', description: '' })
              setCreatedInviteCode(null)
              setShowCreateClassModal(true)
            }}
          >
            Create Class
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            fontSize: '0.88rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            fontSize: '0.88rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle className="w-4 h-4" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
        {[
          { id: 'classes', label: 'All Classes', icon: GraduationCap },
          { id: 'students', label: 'Student Roster', icon: Users },
          { id: 'subjects', label: 'Subjects & Topics', icon: FolderKanban },
          { id: 'challenges', label: 'Challenges & AI', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                border: 'none',
                background: 'transparent',
                color: isActive ? '#818cf8' : 'var(--text-secondary)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '0.88rem',
                borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab 1: All Classes */}
      {activeTab === 'classes' && (
        <>
          {loadingClasses ? (
            <TableSkeleton rows={4} cols={4} />
          ) : classes.length === 0 ? (
            <Card>
              <EmptyState
                icon={GraduationCap}
                title="No Classes Yet"
                description="Click 'Create Class' above to set up your first classroom."
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
                            Grade {cls.grade || '—'} {cls.description && `• ${cls.description}`}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <Badge variant="primary">Active</Badge>
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
                          Invite Code
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '1.1rem', color: '#38bdf8' }}>
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
                        Dashboard →
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          selectClass(cls.id)
                          setActiveTab('students')
                        }}
                      >
                        Roster
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          selectClass(cls.id)
                          setActiveTab('subjects')
                        }}
                      >
                        Curriculum
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Students Roster */}
      {activeTab === 'students' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700' }}>Class Student Roster ({members.length})</h2>
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchMembers}>
              Refresh
            </Button>
          </div>

          {loadingMembers ? (
            <TableSkeleton rows={5} cols={5} />
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Students in this Class"
              description="Share the class invite code with your students so they can join."
            />
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Identifier / Contact</th>
                    <th>Role</th>
                    <th>Joined Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const u = m.user || {}
                    return (
                      <tr key={m.id || u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                                color: '#818cf8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                              }}
                            >
                              {u.display_name ? u.display_name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                {u.display_name || 'Unnamed Student'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          {u.identifier || '—'}
                        </td>
                        <td>
                          <Badge variant={m.role === 'TEACHER' ? 'purple' : 'primary'}>{m.role || 'STUDENT'}</Badge>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={BarChart2}
                              onClick={() => onNavigate(`analytics-student-${u.id}`)}
                            >
                              Stats
                            </Button>
                            {m.role !== 'TEACHER' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                style={{ color: '#f87171' }}
                                icon={Trash2}
                                onClick={() => handleRemoveMember(u.id, u.display_name)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Subjects & Topics */}
      {activeTab === 'subjects' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
          {/* Subjects column */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Subjects</h2>
              <Button
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setSubjectForm({ id: null, name: '', description: '' })
                  setShowSubjectModal(true)
                }}
              >
                Add
              </Button>
            </div>

            {loadingSubjects ? (
              <TableSkeleton rows={3} cols={1} />
            ) : subjects.length === 0 ? (
              <EmptyState icon={BookOpen} title="No Subjects" description="Add a subject to create topics." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {subjects.map((sub) => {
                  const isSel = sub.id === selectedSubjectId
                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSubjectId(sub.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSel ? '1px solid #6366f1' : '1px solid var(--border-card)',
                        backgroundColor: isSel ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: isSel ? '#818cf8' : 'var(--text-primary)' }}>
                          {sub.name}
                        </div>
                        {sub.description && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sub.description}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSubjectForm({ id: sub.id, name: sub.name, description: sub.description || '' })
                            setShowSubjectModal(true)
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleArchiveSubject(sub.id)
                          }}
                          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Topics column */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: '700' }}>
                  Topics for {subjects.find((s) => s.id === selectedSubjectId)?.name || 'Selected Subject'}
                </h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Manage lesson topics and AI prompt source materials
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                disabled={!selectedSubjectId}
                onClick={() => {
                  setTopicForm({
                    id: null,
                    title: '',
                    description: '',
                    difficulty: 'MEDIUM',
                    source_context: '',
                  })
                  setShowTopicModal(true)
                }}
              >
                Add Topic
              </Button>
            </div>

            {loadingTopics ? (
              <TableSkeleton rows={4} cols={4} />
            ) : topics.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No Topics in this Subject"
                description="Add topics to generate AI challenges and monitor student mastery."
              />
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Topic</th>
                      <th>Difficulty</th>
                      <th>Source Material</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map((top) => (
                      <tr key={top.id}>
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{top.title}</div>
                          {top.description && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{top.description}</div>
                          )}
                        </td>
                        <td>
                          <Badge
                            variant={
                              top.difficulty === 'HARD' ? 'red' : top.difficulty === 'EASY' ? 'success' : 'warning'
                            }
                          >
                            {top.difficulty || 'MEDIUM'}
                          </Badge>
                        </td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {top.source_context || '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Layers}
                              onClick={() => {
                                setSelectedTopicId(top.id)
                                setActiveTab('challenges')
                              }}
                            >
                              Challenges
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={BarChart2}
                              onClick={() => onNavigate(`analytics-topic-${top.id}`)}
                            >
                              Analytics
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Edit2}
                              onClick={() => {
                                setTopicForm({
                                  id: top.id,
                                  title: top.title,
                                  description: top.description || '',
                                  difficulty: top.difficulty || 'MEDIUM',
                                  source_context: top.source_context || '',
                                })
                                setShowTopicModal(true)
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              style={{ color: '#f87171' }}
                              icon={Trash2}
                              onClick={() => handleArchiveTopic(top.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 4: Challenges & AI */}
      {activeTab === 'challenges' && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Filter by Topic
                </span>
                <select
                  value={selectedTopicId || ''}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                  }}
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="primary"
                icon={Sparkles}
                disabled={!selectedTopicId}
                onClick={() => setShowAiGenModal(true)}
              >
                Generate AI Challenge
              </Button>
              <Button
                variant="secondary"
                icon={FilePlus2}
                disabled={!selectedTopicId}
                onClick={() => setShowManualModal(true)}
              >
                Manual Challenge
              </Button>
            </div>
          </div>

          {loadingChallenges ? (
            <TableSkeleton rows={4} cols={5} />
          ) : challenges.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No Challenges Generated"
              description="Click 'Generate AI Challenge' to create high-quality AI practice sets for your students."
            />
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title & Type</th>
                    <th>Origin</th>
                    <th>Difficulty</th>
                    <th>Questions</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {challenges.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{c.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.type}</div>
                      </td>
                      <td>
                        <Badge variant={c.origin === 'AI' ? 'purple' : 'primary'}>{c.origin}</Badge>
                      </td>
                      <td>
                        <Badge
                          variant={c.difficulty === 'HARD' ? 'red' : c.difficulty === 'EASY' ? 'success' : 'warning'}
                        >
                          {c.difficulty || 'MEDIUM'}
                        </Badge>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{c.question_count || 5} Qs</td>
                      <td>
                        <Badge
                          variant={
                            c.status === 'READY' ? 'success' : c.status === 'FAILED' ? 'red' : 'warning'
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleChallengeStatus(c.id, c.status)}
                        >
                          {c.status === 'READY' ? 'Archive' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal: Create Class */}
      {showCreateClassModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>Create New Class</h2>

            {createdInviteCode ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle2 className="w-12 h-12 text-emerald-400" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Class Created!
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Give this invite code to students to join:
                </p>
                <div
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.4rem',
                    fontWeight: '800',
                    color: '#38bdf8',
                    letterSpacing: '0.1em',
                    marginBottom: '16px',
                  }}
                >
                  {createdInviteCode}
                </div>
                <Button
                  variant="primary"
                  onClick={() => {
                    handleCopyInvite(createdInviteCode, 'modal')
                    setShowCreateClassModal(false)
                  }}
                >
                  Copy & Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateClass}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Class Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClassData.name}
                    onChange={(e) => setNewClassData({ ...newClassData, name: e.target.value })}
                    placeholder="e.g. 9-A Algebra & Physics"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Grade Level
                  </label>
                  <input
                    type="text"
                    value={newClassData.grade}
                    onChange={(e) => setNewClassData({ ...newClassData, grade: e.target.value })}
                    placeholder="e.g. 9"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={newClassData.description}
                    onChange={(e) => setNewClassData({ ...newClassData, description: e.target.value })}
                    placeholder="e.g. Advanced STEM group"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <Button variant="ghost" onClick={() => setShowCreateClassModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" loading={isSubmitting}>
                    Create Class
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Subject */}
      {showSubjectModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px' }}>
              {subjectForm.id ? 'Edit Subject' : 'Add Subject'}
            </h2>
            <form onSubmit={handleSaveSubject}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="e.g. Mathematics"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  placeholder="e.g. Core algebra and geometry"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="ghost" onClick={() => setShowSubjectModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={isSubmitting}>
                  Save Subject
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Topic */}
      {showTopicModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px' }}>
              {topicForm.id ? 'Edit Topic' : 'Add Topic'}
            </h2>
            <form onSubmit={handleSaveTopic}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Topic Title *
                </label>
                <input
                  type="text"
                  required
                  value={topicForm.title}
                  onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                  placeholder="e.g. Quadratic Equations & Factoring"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Difficulty Level
                </label>
                <select
                  value={topicForm.difficulty}
                  onChange={(e) => setTopicForm({ ...topicForm, difficulty: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  AI Source Context / Lesson Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={topicForm.source_context}
                  onChange={(e) => setTopicForm({ ...topicForm, source_context: e.target.value })}
                  placeholder="Paste textbook summary, formulas, or key concepts for the AI challenge generator..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="ghost" onClick={() => setShowTopicModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={isSubmitting}>
                  Save Topic
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Generate AI Challenge */}
      {showAiGenModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  color: '#818cf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Generate AI Challenge</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Creates 5 interactive curriculum questions
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Select Difficulty
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {['EASY', 'MEDIUM', 'HARD'].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setAiGenDifficulty(diff)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: aiGenDifficulty === diff ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                      backgroundColor: aiGenDifficulty === diff ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-app)',
                      color: aiGenDifficulty === diff ? '#818cf8' : 'var(--text-secondary)',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="ghost" onClick={() => setShowAiGenModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" icon={Sparkles} loading={isSubmitting} onClick={handleGenerateAiChallenge}>
                Start AI Generation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manual Challenge */}
      {showManualModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>
              Create Manual Teacher Challenge
            </h2>
            <form onSubmit={handleCreateManualChallenge}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Challenge Title *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  placeholder="e.g. Unit 3 Test — Linear Systems"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {manualForm.questions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    padding: '14px',
                    borderRadius: '8px',
                    marginBottom: '14px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '8px', color: '#818cf8' }}>
                    Question {qIdx + 1}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter question prompt..."
                    value={q.prompt}
                    onChange={(e) => {
                      const copy = [...manualForm.questions]
                      copy[qIdx].prompt = e.target.value
                      setManualForm({ ...manualForm, questions: copy })
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      marginBottom: '8px',
                    }}
                  />

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Options (Select the radio button for the correct answer):
                  </div>
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <input
                        type="radio"
                        name={`correct-opt-${qIdx}`}
                        checked={opt.is_correct}
                        onChange={() => {
                          const copy = [...manualForm.questions]
                          copy[qIdx].options = copy[qIdx].options.map((o, i) => ({
                            ...o,
                            is_correct: i === optIdx,
                          }))
                          setManualForm({ ...manualForm, questions: copy })
                        }}
                      />
                      <input
                        type="text"
                        required
                        placeholder={`Option ${optIdx + 1}`}
                        value={opt.text}
                        onChange={(e) => {
                          const copy = [...manualForm.questions]
                          copy[qIdx].options[optIdx].text = e.target.value
                          setManualForm({ ...manualForm, questions: copy })
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          backgroundColor: 'var(--bg-app)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.82rem',
                        }}
                      />
                    </div>
                  ))}

                  <input
                    type="text"
                    placeholder="Explanation for correct answer (optional)..."
                    value={q.explanation}
                    onChange={(e) => {
                      const copy = [...manualForm.questions]
                      copy[qIdx].explanation = e.target.value
                      setManualForm({ ...manualForm, questions: copy })
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--text-muted)',
                      fontSize: '0.78rem',
                      marginTop: '6px',
                    }}
                  />
                </div>
              ))}

              <Button
                variant="secondary"
                size="sm"
                type="button"
                icon={Plus}
                style={{ marginBottom: '20px' }}
                onClick={() => {
                  setManualForm({
                    ...manualForm,
                    questions: [
                      ...manualForm.questions,
                      {
                        prompt: '',
                        explanation: '',
                        options: [
                          { text: '', is_correct: true },
                          { text: '', is_correct: false },
                          { text: '', is_correct: false },
                          { text: '', is_correct: false },
                        ],
                      },
                    ],
                  })
                }}
              >
                Add Another Question
              </Button>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="ghost" onClick={() => setShowManualModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={isSubmitting}>
                  Save & Publish Challenge
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
