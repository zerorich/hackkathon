import { useState, useEffect, useCallback } from 'react'
import {
  GraduationCap,
  Users,
  BookOpen,
  Layers,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  Sparkles,
  Award,
  Flame,
  BarChart2,
  ExternalLink,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { Input, Textarea, Select } from '../../components/ui/Input'
import { Table, TableRow, TableCell } from '../../components/ui/Table'
import { TableSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { api } from '../../lib/api'
import { useClass } from '../../stores/ClassContext'

export function ClassDetailPage({ classId, onNavigate }) {
  const { selectClass, refreshClasses } = useClass()
  const [activeTab, setActiveTab] = useState('students') // 'students' | 'subjects' | 'challenges'

  const [classInfo, setClassInfo] = useState(null)
  const [members, setMembers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copiedCode, setCopiedCode] = useState(false)

  // Remove member state
  const [memberToRemove, setMemberToRemove] = useState(null)
  const [removingMember, setRemovingMember] = useState(false)

  // Subject Modal states
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [subjectForm, setSubjectForm] = useState({ name: '', description: '', icon_key: 'math' })
  const [subjectSubmitting, setSubjectSubmitting] = useState(false)
  const [subjectError, setSubjectError] = useState(null)
  const [subjectToArchive, setSubjectToArchive] = useState(null)
  const [archivingSubject, setArchivingSubject] = useState(false)
  const [archiveErrorNotice, setArchiveErrorNotice] = useState(null)

  // AI Generation & Challenge states
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [selectedTopicForGen, setSelectedTopicForGen] = useState('')
  const [allTopics, setAllTopics] = useState([])
  const [genDifficulty, setGenDifficulty] = useState('MEDIUM')
  const [genQuestionCount, setGenQuestionCount] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [genStatusText, setGenStatusText] = useState('')
  const [genError, setGenError] = useState(null)

  // Challenge preview state
  const [previewChallenge, setPreviewChallenge] = useState(null)

  // Manual Challenge Modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualTopicId, setManualTopicId] = useState('')
  const [manualDifficulty, setManualDifficulty] = useState('MEDIUM')
  const [manualQuestions, setManualQuestions] = useState([
    {
      prompt: '',
      type: 'SINGLE_CHOICE',
      explanation: '',
      points: 1,
      options: [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ],
    },
  ])
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [manualError, setManualError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      selectClass(classId)

      // Fetch class details & members
      const [classRes, membersRes, subjectsRes] = await Promise.all([
        api.classes.get(classId),
        api.classes.listMembers(classId),
        api.subjects.list(classId),
      ])

      setClassInfo(classRes)
      setMembers(Array.isArray(membersRes) ? membersRes : [])
      const subjList = Array.isArray(subjectsRes) ? subjectsRes : []
      setSubjects(subjList)

      // Fetch topics for all subjects to populate challenges tab
      const topicsAcc = []
      const challengesAcc = []
      for (const subj of subjList) {
        try {
          const topList = await api.topics.list(subj.id)
          const tops = Array.isArray(topList) ? topList : []
          tops.forEach((t) => {
            topicsAcc.push({ ...t, subjectName: subj.name, subjectId: subj.id })
          })
          for (const top of tops) {
            try {
              const chalList = await api.challenges.listByTopic(top.id)
              const chals = Array.isArray(chalList) ? chalList : []
              chals.forEach((c) => {
                challengesAcc.push({
                  ...c,
                  topicTitle: top.title,
                  subjectName: subj.name,
                })
              })
            } catch {
              // ignore per topic
            }
          }
        } catch {
          // ignore
        }
      }
      setAllTopics(topicsAcc)
      setChallenges(challengesAcc)
      if (topicsAcc.length > 0 && !selectedTopicForGen) {
        setSelectedTopicForGen(topicsAcc[0].id)
      }
      if (topicsAcc.length > 0 && !manualTopicId) {
        setManualTopicId(topicsAcc[0].id)
      }
    } catch (err) {
      setError(err.message || 'Failed to load class details')
    } finally {
      setLoading(false)
    }
  }, [classId, selectClass, selectedTopicForGen, manualTopicId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCopyInvite = () => {
    if (classInfo?.invite_code) {
      navigator.clipboard.writeText(classInfo.invite_code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  // Remove member handler
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return
    try {
      setRemovingMember(true)
      await api.classes.removeMember(classId, memberToRemove.user_id)
      setMemberToRemove(null)
      await fetchData()
    } catch (err) {
      alert(`Error removing student: ${err.message}`)
    } finally {
      setRemovingMember(false)
    }
  }

  // Subject Create / Edit handler
  const handleOpenSubjectModal = (subject = null) => {
    if (subject) {
      setEditingSubject(subject)
      setSubjectForm({
        name: subject.name,
        description: subject.description || '',
        icon_key: subject.icon_key || 'math',
      })
    } else {
      setEditingSubject(null)
      setSubjectForm({ name: '', description: '', icon_key: 'math' })
    }
    setSubjectError(null)
    setIsSubjectModalOpen(true)
  }

  const handleSaveSubject = async (e) => {
    e.preventDefault()
    if (!subjectForm.name.trim()) {
      setSubjectError('Subject name is required')
      return
    }

    try {
      setSubjectSubmitting(true)
      setSubjectError(null)
      if (editingSubject) {
        await api.subjects.update(editingSubject.id, {
          name: subjectForm.name.trim(),
          description: subjectForm.description.trim() || undefined,
          icon_key: subjectForm.icon_key,
        })
      } else {
        await api.subjects.create(classId, {
          name: subjectForm.name.trim(),
          description: subjectForm.description.trim() || undefined,
          icon_key: subjectForm.icon_key,
        })
      }
      setIsSubjectModalOpen(false)
      await fetchData()
      await refreshClasses()
    } catch (err) {
      setSubjectError(err.message || 'Failed to save subject')
    } finally {
      setSubjectSubmitting(false)
    }
  }

  // Archive Subject handler
  const handleConfirmArchiveSubject = async () => {
    if (!subjectToArchive) return
    try {
      setArchivingSubject(true)
      setArchiveErrorNotice(null)
      await api.subjects.archive(subjectToArchive.id)
      setSubjectToArchive(null)
      await fetchData()
    } catch (err) {
      if (err.code === 'SUBJECT_HAS_ACTIVE_CONTENT') {
        setArchiveErrorNotice(
          'Cannot archive this subject because it contains active topics or challenges. Please archive topics first.'
        )
      } else {
        setArchiveErrorNotice(err.message || 'Failed to archive subject')
      }
    } finally {
      setArchivingSubject(false)
    }
  }

  // AI Generation trigger & polling
  const handleTriggerAIGeneration = async (e) => {
    e.preventDefault()
    if (!selectedTopicForGen) {
      setGenError('Please select a topic for challenge generation')
      return
    }
    try {
      setGenerating(true)
      setGenError(null)
      setGenStatusText('Submitting AI generation task to agent orchestrator...')

      const genRes = await api.challenges.generate(selectedTopicForGen, {
        difficulty: genDifficulty,
        question_count: Number(genQuestionCount),
      })

      const challengeId = genRes.challenge_id
      setGenStatusText('AI Agents generating syllabus-aligned questions...')

      // Polling loop for status
      let attempts = 0
      const maxAttempts = 30
      const pollInterval = setInterval(async () => {
        attempts++
        try {
          const statusRes = await api.challenges.getStatus(challengeId)
          if (statusRes.status === 'READY') {
            clearInterval(pollInterval)
            setGenStatusText('✨ Challenge generated successfully!')
            setTimeout(async () => {
              setIsGenerateModalOpen(false)
              setGenerating(false)
              await fetchData()
            }, 1000)
          } else if (statusRes.status === 'FAILED') {
            clearInterval(pollInterval)
            setGenError(statusRes.generation_error || 'AI Generation failed. Try again.')
            setGenerating(false)
          } else {
            setGenStatusText(`AI Agent generating questions (step ${attempts}/30)...`)
          }
        } catch {
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval)
            setGenError('Generation timeout. The job may still finish in the background.')
            setGenerating(false)
          }
        }
      }, 1500)
    } catch (err) {
      setGenError(err.message || 'Failed to start AI generation')
      setGenerating(false)
    }
  }

  // Open Challenge Preview
  const handleOpenPreview = async (challengeId) => {
    try {
      const data = await api.challenges.get(challengeId)
      setPreviewChallenge(data)
    } catch (err) {
      alert(`Error loading challenge details: ${err.message}`)
    }
  }

  // Toggle Challenge status (Publish / Archive)
  const handleToggleChallengeStatus = async (challengeId, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'READY' ? 'ARCHIVED' : 'READY'
      await api.challenges.updateStatus(challengeId, nextStatus)
      if (previewChallenge && previewChallenge.id === challengeId) {
        setPreviewChallenge({ ...previewChallenge, status: nextStatus })
      }
      await fetchData()
    } catch (err) {
      alert(`Failed to update challenge status: ${err.message}`)
    }
  }

  // Manual Challenge Creation
  const handleAddQuestionRow = () => {
    setManualQuestions([
      ...manualQuestions,
      {
        prompt: '',
        type: 'SINGLE_CHOICE',
        explanation: '',
        points: 1,
        options: [
          { text: '', is_correct: true },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
        ],
      },
    ])
  }

  const handleCreateManualChallenge = async (e) => {
    e.preventDefault()
    if (!manualTitle.trim()) {
      setManualError('Challenge title is required')
      return
    }
    if (!manualTopicId) {
      setManualError('Please select a topic')
      return
    }

    // Validate questions
    for (let i = 0; i < manualQuestions.length; i++) {
      const q = manualQuestions[i]
      if (!q.prompt.trim()) {
        setManualError(`Question ${i + 1} prompt is required`)
        return
      }
      const correctCount = q.options.filter((o) => o.is_correct).length
      if (correctCount !== 1) {
        setManualError(`Question ${i + 1} must have exactly ONE correct option selected`)
        return
      }
      if (q.options.some((o) => !o.text.trim())) {
        setManualError(`Question ${i + 1} has empty option text`)
        return
      }
    }

    try {
      setManualSubmitting(true)
      setManualError(null)
      await api.challenges.createManual(manualTopicId, {
        title: manualTitle.trim(),
        difficulty: manualDifficulty,
        questions: manualQuestions,
      })
      setIsManualModalOpen(false)
      await fetchData()
    } catch (err) {
      setManualError(err.message || 'Failed to create manual challenge')
    } finally {
      setManualSubmitting(false)
    }
  }

  const studentMembers = members.filter((m) => m.role === 'STUDENT')

  return (
    <div className="page-container">
      {error && (
        <div
          style={{
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '10px',
            padding: '12px 16px',
            color: '#fb7185',
            fontSize: '0.86rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Back Button & Class Header */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => onNavigate('classes')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            marginBottom: '12px',
            padding: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Classes
        </button>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
                flexShrink: 0,
              }}
            >
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
                  {classInfo?.name || 'Loading Class...'}
                </h1>
                <Badge variant="purple">Grade {classInfo?.grade || '—'}</Badge>
                <Badge variant="success">{classInfo?.status || 'ACTIVE'}</Badge>
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {classInfo?.description || 'Classroom curriculum and active student members'}
              </p>
            </div>
          </div>

          {/* Quick Actions & Invite Code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Student Invite Code
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '0.98rem', color: '#38bdf8' }}>
                  {classInfo?.invite_code || '—'}
                </div>
              </div>
              {classInfo?.invite_code && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={copiedCode ? Check : Copy}
                  onClick={handleCopyInvite}
                  style={{ color: copiedCode ? '#34d399' : undefined }}
                >
                  {copiedCode ? 'Copied' : 'Copy'}
                </Button>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={BarChart2}
              onClick={() => onNavigate('dashboard')}
            >
              Class Analytics →
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '24px',
        }}
      >
        {[
          { id: 'students', label: `Students Roster (${studentMembers.length})`, icon: Users },
          { id: 'subjects', label: `Curriculum Subjects (${subjects.length})`, icon: BookOpen },
          { id: 'challenges', label: `Assessments & AI Arena (${challenges.length})`, icon: Layers },
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
                padding: '12px 18px',
                border: 'none',
                background: 'transparent',
                color: isActive ? '#818cf8' : 'var(--text-secondary)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '0.9rem',
                cursor: 'pointer',
                borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab 1: Students Management */}
      {activeTab === 'students' && (
        <div>
          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : studentMembers.length === 0 ? (
            <Card>
              <EmptyState
                icon={Users}
                title="No Students Enrolled Yet"
                description={`Share the classroom invite code (${classInfo?.invite_code || '...'}) with your students so they can join from the student portal.`}
                action={
                  <Button variant="primary" icon={Copy} onClick={handleCopyInvite}>
                    Copy Invite Code
                  </Button>
                }
              />
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <Table
                headers={[
                  { label: 'Student' },
                  { label: 'Level' },
                  { label: 'Total XP' },
                  { label: 'Streak' },
                  { label: 'Status' },
                  { label: 'Actions', style: { textAlign: 'right' } },
                ]}
              >
                {studentMembers.map((member) => {
                  const stats = member.student_stats || {}
                  return (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(99, 102, 241, 0.2)',
                              color: '#818cf8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '0.82rem',
                            }}
                          >
                            {member.display_name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {member.display_name}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {member.identifier}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="purple" style={{ fontSize: '0.75rem' }}>
                          Level {stats.level || 1}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#f59e0b' }}>
                          <Award className="w-4 h-4 text-amber-400" />
                          {(stats.total_xp || 0).toLocaleString()} XP
                        </div>
                      </TableCell>

                      <TableCell>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fb7185', fontWeight: '600' }}>
                          <Flame className="w-4 h-4" />
                          {stats.streak || 0} days
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant={member.status === 'ACTIVE' ? 'success' : 'danger'}>
                          {member.status || 'ACTIVE'}
                        </Badge>
                      </TableCell>

                      <TableCell style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={ExternalLink}
                            onClick={() => onNavigate(`analytics-student-${member.user_id}`)}
                            title="View Student Analytics"
                          >
                            Analytics
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            onClick={() => setMemberToRemove(member)}
                            title="Remove from class"
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Subjects Management */}
      {activeTab === 'subjects' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>Classroom Subjects</h3>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenSubjectModal()}>
              Add New Subject
            </Button>
          </div>

          {archiveErrorNotice && (
            <div
              style={{
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#fb7185',
                fontSize: '0.85rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{archiveErrorNotice}</span>
            </div>
          )}

          {loading ? (
            <TableSkeleton rows={3} cols={4} />
          ) : subjects.length === 0 ? (
            <Card>
              <EmptyState
                icon={BookOpen}
                title="No Subjects Configured"
                description="Add subjects (like Algebra, Physics, Computer Science) to organize curriculum topics."
                action={
                  <Button variant="primary" icon={Plus} onClick={() => handleOpenSubjectModal()}>
                    Add Subject
                  </Button>
                }
              />
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {subjects.map((subj) => (
                <Card
                  key={subj.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(6, 182, 212, 0.15)',
                            color: '#06b6d4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            {subj.name}
                          </div>
                          <Badge variant="neutral" style={{ fontSize: '0.68rem' }}>
                            {subj.icon_key || 'General'}
                          </Badge>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Edit2}
                          onClick={() => handleOpenSubjectModal(subj)}
                          title="Edit Subject"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => {
                            setArchiveErrorNotice(null)
                            setSubjectToArchive(subj)
                          }}
                          style={{ color: '#fb7185' }}
                          title="Archive Subject"
                        />
                      </div>
                    </div>

                    <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '16px', minHeight: '38px' }}>
                      {subj.description || 'Curriculum units, practice challenges, and tests.'}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Layers}
                    onClick={() => onNavigate('subjects')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Manage Topics & Challenges →
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Challenges & AI Arena */}
      {activeTab === 'challenges' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>
              Assessments & AI Generation ({challenges.length})
            </h3>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setManualError(null)
                  setIsManualModalOpen(true)
                }}
              >
                Manual Quiz Creator
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Sparkles}
                onClick={() => {
                  setGenError(null)
                  setIsGenerateModalOpen(true)
                }}
              >
                AI Challenge Generator
              </Button>
            </div>
          </div>

          {challenges.length === 0 ? (
            <Card>
              <EmptyState
                icon={Sparkles}
                title="No Challenges Created Yet"
                description="Use the AI Generator to automatically craft practice sets from syllabus topics, or create quizzes manually."
                action={
                  <Button
                    variant="primary"
                    icon={Sparkles}
                    onClick={() => {
                      setGenError(null)
                      setIsGenerateModalOpen(true)
                    }}
                  >
                    Generate First AI Challenge
                  </Button>
                }
              />
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <Table
                headers={[
                  { label: 'Challenge Title' },
                  { label: 'Topic & Subject' },
                  { label: 'Origin' },
                  { label: 'Difficulty' },
                  { label: 'Questions' },
                  { label: 'Status' },
                  { label: 'Actions', style: { textAlign: 'right' } },
                ]}
              >
                {challenges.map((chal) => (
                  <TableRow key={chal.id}>
                    <TableCell>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{chal.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Created {new Date(chal.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{chal.topicTitle}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{chal.subjectName}</div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={chal.origin === 'AI' ? 'purple' : 'primary'} style={{ fontSize: '0.72rem' }}>
                        {chal.origin === 'AI' ? '✨ AI Gen' : '👤 Teacher'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          chal.difficulty === 'EASY' ? 'success' : chal.difficulty === 'HARD' ? 'danger' : 'warning'
                        }
                      >
                        {chal.difficulty}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                        {chal.question_count} Qs
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          chal.status === 'READY'
                            ? 'success'
                            : chal.status === 'ARCHIVED'
                            ? 'neutral'
                            : 'warning'
                        }
                      >
                        {chal.status}
                      </Badge>
                    </TableCell>

                    <TableCell style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenPreview(chal.id)}
                        >
                          Preview
                        </Button>
                        <Button
                          variant={chal.status === 'READY' ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleChallengeStatus(chal.id, chal.status)}
                        >
                          {chal.status === 'READY' ? 'Archive' : 'Publish'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* Remove Member Confirm Modal */}
      <ConfirmModal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemoveMember}
        title="Remove Student from Class"
        description={`Are you sure you want to remove ${memberToRemove?.display_name || 'this student'} from this classroom? They will lose access to class duels and practice sets.`}
        confirmText="Remove Student"
        isLoading={removingMember}
      />

      {/* Archive Subject Confirm Modal */}
      <ConfirmModal
        isOpen={!!subjectToArchive}
        onClose={() => setSubjectToArchive(null)}
        onConfirm={handleConfirmArchiveSubject}
        title="Archive Subject"
        description={`Are you sure you want to archive subject "${subjectToArchive?.name}"? All topics must be resolved first.`}
        confirmText="Archive Subject"
        isLoading={archivingSubject}
      />

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Add New Subject'}
        subtitle="Configure the subject curriculum domain for this class."
        icon={BookOpen}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsSubjectModalOpen(false)} disabled={subjectSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveSubject} loading={subjectSubmitting}>
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveSubject}>
          {subjectError && (
            <div
              style={{
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fb7185',
                fontSize: '0.84rem',
                marginBottom: '16px',
              }}
            >
              {subjectError}
            </div>
          )}

          <Input
            label="Subject Name"
            placeholder="e.g. Algebra, Fizika, Ingliz tili, Informatika"
            required
            value={subjectForm.name}
            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
            autoFocus
          />

          <Select
            label="Category / Icon Key"
            value={subjectForm.icon_key}
            onChange={(e) => setSubjectForm({ ...subjectForm, icon_key: e.target.value })}
            options={[
              { value: 'math', label: 'Mathematics / Algebra' },
              { value: 'physics', label: 'Physics' },
              { value: 'cs', label: 'Computer Science & AI' },
              { value: 'english', label: 'English Language' },
              { value: 'science', label: 'General Science' },
            ]}
          />

          <Textarea
            label="Description (Optional)"
            placeholder="Overview of curriculum modules covered in this subject"
            value={subjectForm.description}
            onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
          />
        </form>
      </Modal>

      {/* AI Challenge Generator Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          if (!generating) setIsGenerateModalOpen(false)
        }}
        title="AI Challenge Generator"
        subtitle="Our Agentic AI orchestrator will generate high-quality questions with explanations."
        icon={Sparkles}
        footer={
          !generating && (
            <>
              <Button variant="secondary" onClick={() => setIsGenerateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" icon={Sparkles} onClick={handleTriggerAIGeneration}>
                Generate AI Challenge
              </Button>
            </>
          )
        }
      >
        {generating ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                animation: 'pulse 1.5s infinite',
              }}
            >
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
              Synthesizing Challenge...
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              {genStatusText}
            </p>
          </div>
        ) : (
          <form onSubmit={handleTriggerAIGeneration}>
            {genError && (
              <div
                style={{
                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fb7185',
                  fontSize: '0.84rem',
                  marginBottom: '16px',
                }}
              >
                {genError}
              </div>
            )}

            <Select
              label="Select Topic"
              required
              value={selectedTopicForGen}
              onChange={(e) => setSelectedTopicForGen(e.target.value)}
              options={
                allTopics.length > 0
                  ? allTopics.map((t) => ({
                      value: t.id,
                      label: `${t.subjectName} → ${t.title} (${t.difficulty})`,
                    }))
                  : [{ value: '', label: 'No active topics found. Create a topic first.' }]
              }
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Select
                label="Difficulty Level"
                value={genDifficulty}
                onChange={(e) => setGenDifficulty(e.target.value)}
                options={[
                  { value: 'EASY', label: 'Easy (Foundational)' },
                  { value: 'MEDIUM', label: 'Medium (Standard)' },
                  { value: 'HARD', label: 'Hard (Olympiad / Deep)' },
                ]}
              />

              <Select
                label="Question Count"
                value={genQuestionCount}
                onChange={(e) => setGenQuestionCount(Number(e.target.value))}
                options={[
                  { value: 5, label: '5 Questions' },
                  { value: 7, label: '7 Questions' },
                  { value: 10, label: '10 Questions' },
                ]}
              />
            </div>
          </form>
        )}
      </Modal>

      {/* Manual Challenge Creator Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Create Manual Challenge Quiz"
        subtitle="Craft custom questions with multiple choice options and explanations."
        maxWidth="720px"
        icon={Plus}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsManualModalOpen(false)} disabled={manualSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateManualChallenge} loading={manualSubmitting}>
              Publish Manual Challenge
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateManualChallenge}>
          {manualError && (
            <div
              style={{
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fb7185',
                fontSize: '0.84rem',
                marginBottom: '16px',
              }}
            >
              {manualError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <Input
              label="Quiz Title"
              placeholder="e.g. Weekly Algebra Mastery Quiz #1"
              required
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
            />
            <Select
              label="Difficulty"
              value={manualDifficulty}
              onChange={(e) => setManualDifficulty(e.target.value)}
              options={[
                { value: 'EASY', label: 'Easy' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HARD', label: 'Hard' },
              ]}
            />
          </div>

          <Select
            label="Target Topic"
            required
            value={manualTopicId}
            onChange={(e) => setManualTopicId(e.target.value)}
            options={allTopics.map((t) => ({
              value: t.id,
              label: `${t.subjectName} → ${t.title}`,
            }))}
          />

          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Questions ({manualQuestions.length})
              </label>
              <Button variant="secondary" size="sm" icon={Plus} onClick={handleAddQuestionRow}>
                Add Question
              </Button>
            </div>

            {manualQuestions.map((q, qIdx) => (
              <div
                key={qIdx}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ fontWeight: '700', fontSize: '0.84rem', color: '#818cf8', marginBottom: '8px' }}>
                  Question {qIdx + 1}
                </div>

                <Input
                  placeholder="Question prompt (e.g. Find the discriminant of 2x^2 + 5x + 3 = 0)"
                  value={q.prompt}
                  onChange={(e) => {
                    const next = [...manualQuestions]
                    next[qIdx].prompt = e.target.value
                    setManualQuestions(next)
                  }}
                  style={{ marginBottom: '10px' }}
                />

                <div style={{ marginBottom: '8px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Mark the correct option with the radio button:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: opt.is_correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        border: opt.is_correct ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                      }}
                    >
                      <input
                        type="radio"
                        name={`correct-opt-${qIdx}`}
                        checked={opt.is_correct}
                        onChange={() => {
                          const next = [...manualQuestions]
                          next[qIdx].options = next[qIdx].options.map((o, idx) => ({
                            ...o,
                            is_correct: idx === optIdx,
                          }))
                          setManualQuestions(next)
                        }}
                      />
                      <input
                        type="text"
                        placeholder={`Option ${optIdx + 1}`}
                        value={opt.text}
                        onChange={(e) => {
                          const next = [...manualQuestions]
                          next[qIdx].options[optIdx].text = e.target.value
                          setManualQuestions(next)
                        }}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '0.82rem',
                        }}
                      />
                    </div>
                  ))}
                </div>

                <Input
                  placeholder="Explanation / hint for student (Optional)"
                  value={q.explanation}
                  onChange={(e) => {
                    const next = [...manualQuestions]
                    next[qIdx].explanation = e.target.value
                    setManualQuestions(next)
                  }}
                />
              </div>
            ))}
          </div>
        </form>
      </Modal>

      {/* Challenge Preview Modal */}
      <Modal
        isOpen={!!previewChallenge}
        onClose={() => setPreviewChallenge(null)}
        title={previewChallenge?.title || 'Challenge Preview'}
        subtitle={`Difficulty: ${previewChallenge?.difficulty || '—'} • Questions: ${previewChallenge?.questions?.length || 0}`}
        maxWidth="680px"
        icon={Layers}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreviewChallenge(null)}>
              Close
            </Button>
            {previewChallenge && (
              <Button
                variant={previewChallenge.status === 'READY' ? 'secondary' : 'primary'}
                onClick={() => handleToggleChallengeStatus(previewChallenge.id, previewChallenge.status)}
              >
                {previewChallenge.status === 'READY' ? 'Archive Challenge' : 'Publish Challenge'}
              </Button>
            )}
          </>
        }
      >
        {previewChallenge?.questions?.map((q, idx) => (
          <div
            key={q.id || idx}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: '700', color: '#818cf8', fontSize: '0.85rem' }}>
                Question {idx + 1}
              </span>
              <Badge variant="neutral" style={{ fontSize: '0.7rem' }}>
                {q.points || 1} pts
              </Badge>
            </div>

            <p style={{ fontWeight: '600', color: '#fff', fontSize: '0.92rem', marginBottom: '12px' }}>
              {q.prompt}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              {q.options?.map((opt, oIdx) => (
                <div
                  key={opt.id || oIdx}
                  style={{
                    backgroundColor: opt.is_correct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: opt.is_correct ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.84rem',
                    color: opt.is_correct ? '#34d399' : 'var(--text-secondary)',
                    fontWeight: opt.is_correct ? '700' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{opt.text}</span>
                  {opt.is_correct && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
              ))}
            </div>

            {q.explanation && (
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '8px',
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                }}
              >
                <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400 mt-0.5" />
                <span>Explanation: {q.explanation}</span>
              </div>
            )}
          </div>
        ))}
      </Modal>
    </div>
  )
}
