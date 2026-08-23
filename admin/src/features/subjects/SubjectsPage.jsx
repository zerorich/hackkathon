import { useState, useEffect, useCallback } from 'react'
import {
  FolderKanban,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Layers,
  BarChart3,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { useClass } from '../../stores/ClassContext'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { Input, Textarea, Select } from '../../components/ui/Input'
import { TableSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { api } from '../../lib/api'

export function SubjectsPage({ onNavigate }) {
  const { selectedClassId, selectedClass } = useClass()
  const [subjects, setSubjects] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [error, setError] = useState(null)

  // Subject Modal states
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [subjectForm, setSubjectForm] = useState({ name: '', description: '', icon_key: 'math' })
  const [subjectSubmitting, setSubjectSubmitting] = useState(false)
  const [subjectError, setSubjectError] = useState(null)
  const [subjectToArchive, setSubjectToArchive] = useState(null)
  const [archivingSubject, setArchivingSubject] = useState(false)
  const [archiveErrorNotice, setArchiveErrorNotice] = useState(null)

  // Topic Modal states
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState(null)
  const [topicForm, setTopicForm] = useState({
    title: '',
    description: '',
    difficulty: 'MEDIUM',
    source_context: '',
  })
  const [topicSubmitting, setTopicSubmitting] = useState(false)
  const [topicError, setTopicError] = useState(null)
  const [topicToArchive, setTopicToArchive] = useState(null)
  const [archivingTopic, setArchivingTopic] = useState(false)

  // AI Gen Modal for a Topic
  const [targetTopicForGen, setTargetTopicForGen] = useState(null)
  const [genDifficulty, setGenDifficulty] = useState('MEDIUM')
  const [genQuestionCount, setGenQuestionCount] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [genStatusText, setGenStatusText] = useState('')
  const [genError, setGenError] = useState(null)

  // Topic Challenges Preview
  const [topicChallenges, setTopicChallenges] = useState([])
  const [viewingChallengesForTopic, setViewingChallengesForTopic] = useState(null)
  const [loadingTopicChallenges, setLoadingTopicChallenges] = useState(false)
  const [previewChallenge, setPreviewChallenge] = useState(null)

  const fetchSubjects = useCallback(async () => {
    if (!selectedClassId) {
      setSubjects([])
      setTopics([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const res = await api.subjects.list(selectedClassId)
      const list = Array.isArray(res) ? res : []
      setSubjects(list)
      if (list.length > 0) {
        setSelectedSubjectId((prev) => {
          const exists = list.some((s) => s.id === prev)
          return exists ? prev : list[0].id
        })
      } else {
        setSelectedSubjectId('')
        setTopics([])
      }
    } catch (err) {
      setError(err.message || 'Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }, [selectedClassId])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  const fetchTopics = useCallback(async (subjectId) => {
    if (!subjectId) {
      setTopics([])
      return
    }
    try {
      setLoadingTopics(true)
      const res = await api.topics.list(subjectId)
      setTopics(Array.isArray(res) ? res : [])
    } catch {
      setTopics([])
    } finally {
      setLoadingTopics(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSubjectId) {
      fetchTopics(selectedSubjectId)
    }
  }, [selectedSubjectId, fetchTopics])

  // Subject Handlers
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
        const created = await api.subjects.create(selectedClassId, {
          name: subjectForm.name.trim(),
          description: subjectForm.description.trim() || undefined,
          icon_key: subjectForm.icon_key,
        })
        if (created?.id) setSelectedSubjectId(created.id)
      }
      setIsSubjectModalOpen(false)
      await fetchSubjects()
    } catch (err) {
      setSubjectError(err.message || 'Failed to save subject')
    } finally {
      setSubjectSubmitting(false)
    }
  }

  const handleConfirmArchiveSubject = async () => {
    if (!subjectToArchive) return
    try {
      setArchivingSubject(true)
      setArchiveErrorNotice(null)
      await api.subjects.archive(subjectToArchive.id)
      setSubjectToArchive(null)
      await fetchSubjects()
    } catch (err) {
      if (err.code === 'SUBJECT_HAS_ACTIVE_CONTENT') {
        setArchiveErrorNotice(
          'Cannot archive this subject because it contains active topics or challenges. Archive child topics first.'
        )
      } else {
        setArchiveErrorNotice(err.message || 'Failed to archive subject')
      }
    } finally {
      setArchivingSubject(false)
    }
  }

  // Topic Handlers
  const handleOpenTopicModal = (topic = null) => {
    if (topic) {
      setEditingTopic(topic)
      setTopicForm({
        title: topic.title,
        description: topic.description || '',
        difficulty: topic.difficulty || 'MEDIUM',
        source_context: topic.source_context || '',
      })
    } else {
      setEditingTopic(null)
      setTopicForm({
        title: '',
        description: '',
        difficulty: 'MEDIUM',
        source_context: '',
      })
    }
    setTopicError(null)
    setIsTopicModalOpen(true)
  }

  const handleSaveTopic = async (e) => {
    e.preventDefault()
    if (!topicForm.title.trim()) {
      setTopicError('Topic title is required')
      return
    }
    try {
      setTopicSubmitting(true)
      setTopicError(null)
      if (editingTopic) {
        await api.topics.update(editingTopic.id, {
          title: topicForm.title.trim(),
          description: topicForm.description.trim() || undefined,
          difficulty: topicForm.difficulty,
          source_context: topicForm.source_context.trim() || undefined,
        })
      } else {
        await api.topics.create(selectedSubjectId, {
          title: topicForm.title.trim(),
          description: topicForm.description.trim() || undefined,
          difficulty: topicForm.difficulty,
          source_context: topicForm.source_context.trim() || undefined,
        })
      }
      setIsTopicModalOpen(false)
      await fetchTopics(selectedSubjectId)
    } catch (err) {
      setTopicError(err.message || 'Failed to save topic')
    } finally {
      setTopicSubmitting(false)
    }
  }

  const handleConfirmArchiveTopic = async () => {
    if (!topicToArchive) return
    try {
      setArchivingTopic(true)
      await api.topics.archive(topicToArchive.id)
      setTopicToArchive(null)
      await fetchTopics(selectedSubjectId)
    } catch (err) {
      alert(`Error archiving topic: ${err.message}`)
    } finally {
      setArchivingTopic(false)
    }
  }

  // AI Gen for Topic
  const handleTriggerAIGenForTopic = async (e) => {
    e.preventDefault()
    if (!targetTopicForGen) return
    try {
      setGenerating(true)
      setGenError(null)
      setGenStatusText('Submitting topic context to Agentic AI orchestrator...')

      const genRes = await api.challenges.generate(targetTopicForGen.id, {
        difficulty: genDifficulty,
        question_count: Number(genQuestionCount),
      })
      const chalId = genRes.challenge_id
      setGenStatusText('AI Agents generating syllabus-aligned questions...')

      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          const st = await api.challenges.getStatus(chalId)
          if (st.status === 'READY') {
            clearInterval(poll)
            setGenStatusText('✨ Challenge ready!')
            setTimeout(() => {
              setTargetTopicForGen(null)
              setGenerating(false)
            }, 800)
          } else if (st.status === 'FAILED') {
            clearInterval(poll)
            setGenError(st.generation_error || 'AI generation failed')
            setGenerating(false)
          } else {
            setGenStatusText(`AI Agent generating questions (step ${attempts}/30)...`)
          }
        } catch {
          if (attempts >= 30) {
            clearInterval(poll)
            setGenError('Generation timed out')
            setGenerating(false)
          }
        }
      }, 1500)
    } catch (err) {
      setGenError(err.message || 'Failed to generate')
      setGenerating(false)
    }
  }

  // View Challenges for Topic
  const handleOpenTopicChallenges = async (topic) => {
    try {
      setViewingChallengesForTopic(topic)
      setLoadingTopicChallenges(true)
      const data = await api.challenges.listByTopic(topic.id)
      setTopicChallenges(Array.isArray(data) ? data : [])
    } catch (err) {
      alert(`Error loading challenges: ${err.message}`)
    } finally {
      setLoadingTopicChallenges(false)
    }
  }

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || null

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderKanban className="w-6 h-6 text-cyan-400" />
            Curriculum Subjects & Topics
          </h1>
          <p className="page-subtitle">
            Organize study units, assign difficulty levels, and trigger Agentic AI challenge generation
          </p>
        </div>

        {selectedClass && (
          <Button variant="primary" icon={Plus} onClick={() => handleOpenSubjectModal()}>
            Add New Subject
          </Button>
        )}
      </div>

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

      {archiveErrorNotice && (
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
          <span>{archiveErrorNotice}</span>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : subjects.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No Subjects for this Class"
            description="Create a subject domain to begin adding topics and generating AI quizzes."
            action={
              <Button variant="primary" icon={Plus} onClick={() => handleOpenSubjectModal()}>
                Create Subject
              </Button>
            }
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left Panel: Subject List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', padding: '0 4px' }}>
              Subjects ({subjects.length})
            </div>

            {subjects.map((subj) => {
              const isSelected = subj.id === selectedSubjectId
              return (
                <div
                  key={subj.id}
                  onClick={() => setSelectedSubjectId(subj.id)}
                  style={{
                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
                    border: isSelected ? '1.5px solid #6366f1' : '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 15px -3px rgba(99, 102, 241, 0.3)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span style={{ fontWeight: '700', fontSize: '0.92rem', color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                        {subj.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenSubjectModal(subj)
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        title="Edit Subject"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setArchiveErrorNotice(null)
                          setSubjectToArchive(subj)
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '4px' }}
                        title="Archive Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {subj.description || 'No description'}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Right Panel: Topics of Selected Subject */}
          <div>
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff' }}>
                    {selectedSubject?.name || 'Topics'}
                  </h2>
                  <Badge variant="purple">{topics.length} Topics</Badge>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {selectedSubject?.description || 'Manage curriculum topics and assign assessments'}
                </p>
              </div>

              <Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenTopicModal()}>
                Add New Topic
              </Button>
            </div>

            {loadingTopics ? (
              <TableSkeleton rows={4} cols={3} />
            ) : topics.length === 0 ? (
              <Card>
                <EmptyState
                  icon={FolderKanban}
                  title="No Topics in this Subject"
                  description="Add topics (e.g. Quadratic Equations, Linear Algebra, Thermodynamics) to build the curriculum."
                  action={
                    <Button variant="primary" icon={Plus} onClick={() => handleOpenTopicModal()}>
                      Add First Topic
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {topics.map((topic) => (
                  <Card
                    key={topic.id}
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '14px',
                    }}
                  >
                    <div style={{ minWidth: '240px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: '700', color: '#fff' }}>
                          {topic.title}
                        </h4>
                        <Badge
                          variant={
                            topic.difficulty === 'EASY'
                              ? 'success'
                              : topic.difficulty === 'HARD'
                              ? 'danger'
                              : 'warning'
                          }
                          style={{ fontSize: '0.7rem' }}
                        >
                          {topic.difficulty}
                        </Badge>
                      </div>

                      {topic.description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {topic.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Sparkles}
                        onClick={() => {
                          setGenError(null)
                          setTargetTopicForGen(topic)
                        }}
                        style={{ fontSize: '0.78rem' }}
                      >
                        AI Generate
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Layers}
                        onClick={() => handleOpenTopicChallenges(topic)}
                        style={{ fontSize: '0.78rem' }}
                      >
                        Challenges
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={BarChart3}
                        onClick={() => onNavigate(`analytics-topic-${topic.id}`)}
                        title="Topic Analytics"
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Edit2}
                        onClick={() => handleOpenTopicModal(topic)}
                        title="Edit Topic"
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => setTopicToArchive(topic)}
                        style={{ color: '#fb7185' }}
                        title="Archive Topic"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Add New Subject'}
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
            <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', padding: '10px 14px', color: '#fb7185', fontSize: '0.84rem', marginBottom: '16px' }}>
              {subjectError}
            </div>
          )}

          <Input
            label="Subject Name"
            placeholder="e.g. Algebra, Fizika, Ingliz tili"
            required
            value={subjectForm.name}
            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
            autoFocus
          />

          <Select
            label="Domain Category"
            value={subjectForm.icon_key}
            onChange={(e) => setSubjectForm({ ...subjectForm, icon_key: e.target.value })}
            options={[
              { value: 'math', label: 'Mathematics / Algebra' },
              { value: 'physics', label: 'Physics' },
              { value: 'cs', label: 'Computer Science' },
              { value: 'english', label: 'English Language' },
              { value: 'science', label: 'General Science' },
            ]}
          />

          <Textarea
            label="Description (Optional)"
            placeholder="Curriculum summary"
            value={subjectForm.description}
            onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
          />
        </form>
      </Modal>

      {/* Add / Edit Topic Modal */}
      <Modal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        title={editingTopic ? 'Edit Topic' : 'Add New Topic'}
        subtitle={`Subject: ${selectedSubject?.name || '—'}`}
        icon={FolderKanban}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsTopicModalOpen(false)} disabled={topicSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveTopic} loading={topicSubmitting}>
              {editingTopic ? 'Save Changes' : 'Create Topic'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveTopic}>
          {topicError && (
            <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', padding: '10px 14px', color: '#fb7185', fontSize: '0.84rem', marginBottom: '16px' }}>
              {topicError}
            </div>
          )}

          <Input
            label="Topic Title"
            placeholder="e.g. Quadratic Equations, Newton's Laws, Python Loops"
            required
            value={topicForm.title}
            onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
            autoFocus
          />

          <Select
            label="Default Difficulty"
            value={topicForm.difficulty}
            onChange={(e) => setTopicForm({ ...topicForm, difficulty: e.target.value })}
            options={[
              { value: 'EASY', label: 'Easy (Foundational)' },
              { value: 'MEDIUM', label: 'Medium (Standard)' },
              { value: 'HARD', label: 'Hard (Olympiad / Advanced)' },
            ]}
          />

          <Textarea
            label="Description (Optional)"
            placeholder="Key concepts covered in this topic"
            value={topicForm.description}
            onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
          />

          <Textarea
            label="Source Context for AI (Optional)"
            placeholder="Paste syllabus notes, formulas, or textbook excerpt. The AI agent will ground question generation in this material."
            rows={4}
            value={topicForm.source_context}
            onChange={(e) => setTopicForm({ ...topicForm, source_context: e.target.value })}
          />
        </form>
      </Modal>

      {/* Archive Subject Confirm Modal */}
      <ConfirmModal
        isOpen={!!subjectToArchive}
        onClose={() => setSubjectToArchive(null)}
        onConfirm={handleConfirmArchiveSubject}
        title="Archive Subject"
        description={`Are you sure you want to archive subject "${subjectToArchive?.name}"?`}
        confirmText="Archive Subject"
        isLoading={archivingSubject}
      />

      {/* Archive Topic Confirm Modal */}
      <ConfirmModal
        isOpen={!!topicToArchive}
        onClose={() => setTopicToArchive(null)}
        onConfirm={handleConfirmArchiveTopic}
        title="Archive Topic"
        description={`Are you sure you want to archive topic "${topicToArchive?.title}"?`}
        confirmText="Archive Topic"
        isLoading={archivingTopic}
      />

      {/* AI Gen Modal for a Topic */}
      <Modal
        isOpen={!!targetTopicForGen}
        onClose={() => {
          if (!generating) setTargetTopicForGen(null)
        }}
        title={`AI Generation for: ${targetTopicForGen?.title || ''}`}
        subtitle="Our Agentic AI will produce multiple choice practice questions."
        icon={Sparkles}
        footer={
          !generating && (
            <>
              <Button variant="secondary" onClick={() => setTargetTopicForGen(null)}>
                Cancel
              </Button>
              <Button variant="primary" icon={Sparkles} onClick={handleTriggerAIGenForTopic}>
                Generate AI Questions
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
              Crafting Challenge with AI...
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              {genStatusText}
            </p>
          </div>
        ) : (
          <form onSubmit={handleTriggerAIGenForTopic}>
            {genError && (
              <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', padding: '10px 14px', color: '#fb7185', fontSize: '0.84rem', marginBottom: '16px' }}>
                {genError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Select
                label="Difficulty"
                value={genDifficulty}
                onChange={(e) => setGenDifficulty(e.target.value)}
                options={[
                  { value: 'EASY', label: 'Easy' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HARD', label: 'Hard' },
                ]}
              />

              <Select
                label="Questions Count"
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

      {/* Topic Challenges List Modal */}
      <Modal
        isOpen={!!viewingChallengesForTopic}
        onClose={() => setViewingChallengesForTopic(null)}
        title={`Challenges for: ${viewingChallengesForTopic?.title || ''}`}
        subtitle={`${topicChallenges.length} challenges available`}
        maxWidth="680px"
        icon={Layers}
        footer={
          <Button variant="secondary" onClick={() => setViewingChallengesForTopic(null)}>
            Close
          </Button>
        }
      >
        {loadingTopicChallenges ? (
          <TableSkeleton rows={3} cols={3} />
        ) : topicChallenges.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No Challenges Found"
            description="Use AI Generation to create practice quizzes for this topic."
            action={
              <Button
                variant="primary"
                icon={Sparkles}
                onClick={() => {
                  const t = viewingChallengesForTopic
                  setViewingChallengesForTopic(null)
                  setTargetTopicForGen(t)
                }}
              >
                Generate Challenge Now
              </Button>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topicChallenges.map((c) => (
              <div
                key={c.id}
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#fff' }}>{c.title}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <Badge variant={c.origin === 'AI' ? 'purple' : 'primary'} style={{ fontSize: '0.68rem' }}>
                      {c.origin === 'AI' ? '✨ AI Gen' : '👤 Teacher'}
                    </Badge>
                    <Badge variant="neutral" style={{ fontSize: '0.68rem' }}>
                      {c.difficulty}
                    </Badge>
                    <Badge variant={c.status === 'READY' ? 'success' : 'neutral'} style={{ fontSize: '0.68rem' }}>
                      {c.status}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const full = await api.challenges.get(c.id)
                    setPreviewChallenge(full)
                  }}
                >
                  View Details
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Challenge Preview Sub-Modal */}
      <Modal
        isOpen={!!previewChallenge}
        onClose={() => setPreviewChallenge(null)}
        title={previewChallenge?.title || 'Challenge Preview'}
        subtitle={`Questions: ${previewChallenge?.questions?.length || 0}`}
        maxWidth="650px"
        icon={Layers}
        footer={
          <Button variant="secondary" onClick={() => setPreviewChallenge(null)}>
            Back
          </Button>
        }
      >
        {previewChallenge?.questions?.map((q, idx) => (
          <div
            key={q.id || idx}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontWeight: '700', color: '#818cf8', fontSize: '0.84rem', marginBottom: '6px' }}>
              Q{idx + 1}: {q.prompt}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
              {q.options?.map((opt, oIdx) => (
                <div
                  key={opt.id || oIdx}
                  style={{
                    backgroundColor: opt.is_correct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: opt.is_correct ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    color: opt.is_correct ? '#34d399' : 'var(--text-secondary)',
                    fontWeight: opt.is_correct ? '700' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{opt.text}</span>
                  {opt.is_correct && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
              ))}
            </div>
            {q.explanation && (
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <HelpCircle className="w-3 h-3 text-indigo-400" />
                <span>{q.explanation}</span>
              </div>
            )}
          </div>
        ))}
      </Modal>
    </div>
  )
}
