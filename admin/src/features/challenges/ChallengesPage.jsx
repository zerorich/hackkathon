import { useState, useEffect, useCallback } from 'react'
import {
  Layers,
  Sparkles,
  Plus,
  Search,
  Check,
  HelpCircle,
} from 'lucide-react'
import { useClass } from '../../stores/ClassContext'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import { Table, TableRow, TableCell } from '../../components/ui/Table'
import { TableSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { api } from '../../lib/api'

export function ChallengesPage() {
  const { classes, selectedClassId } = useClass()
  const [challenges, setChallenges] = useState([])
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [originFilter, setOriginFilter] = useState('ALL')

  // Preview Modal
  const [previewChallenge, setPreviewChallenge] = useState(null)

  // AI Gen Modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [selectedTopicForGen, setSelectedTopicForGen] = useState('')
  const [genDifficulty, setGenDifficulty] = useState('MEDIUM')
  const [genQuestionCount, setGenQuestionCount] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [genStatusText, setGenStatusText] = useState('')
  const [genError, setGenError] = useState(null)

  // Manual Challenge Modal
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

  const fetchAllChallenges = useCallback(async () => {
    try {
      setLoading(true)
      const allChals = []
      const allTops = []

      // If a class is selected, fetch for that class, otherwise across classes
      const targetClasses = selectedClassId
        ? classes.filter((c) => c.id === selectedClassId)
        : classes

      for (const cls of targetClasses) {
        try {
          const subjects = await api.subjects.list(cls.id)
          const subjList = Array.isArray(subjects) ? subjects : []

          for (const subj of subjList) {
            try {
              const tops = await api.topics.list(subj.id)
              const topList = Array.isArray(tops) ? tops : []

              for (const top of topList) {
                allTops.push({ ...top, subjectName: subj.name, className: cls.name })
                try {
                  const chals = await api.challenges.listByTopic(top.id)
                  const chalList = Array.isArray(chals) ? chals : []
                  for (const c of chalList) {
                    allChals.push({
                      ...c,
                      topicTitle: top.title,
                      subjectName: subj.name,
                      className: cls.name,
                    })
                  }
                } catch {
                  // ignore per topic
                }
              }
            } catch {
              // ignore
            }
          }
        } catch {
          // ignore
        }
      }

      setTopics(allTops)
      setChallenges(allChals)
      if (allTops.length > 0 && !selectedTopicForGen) {
        setSelectedTopicForGen(allTops[0].id)
      }
      if (allTops.length > 0 && !manualTopicId) {
        setManualTopicId(allTops[0].id)
      }
    } catch {
      setChallenges([])
    } finally {
      setLoading(false)
    }
  }, [classes, selectedClassId, selectedTopicForGen, manualTopicId])

  useEffect(() => {
    fetchAllChallenges()
  }, [fetchAllChallenges])

  // Open Preview
  const handleOpenPreview = async (challengeId) => {
    try {
      const full = await api.challenges.get(challengeId)
      setPreviewChallenge(full)
    } catch (err) {
      alert(`Failed to load challenge details: ${err.message}`)
    }
  }

  // Toggle Status
  const handleToggleStatus = async (challengeId, currentStatus) => {
    try {
      const next = currentStatus === 'READY' ? 'ARCHIVED' : 'READY'
      await api.challenges.updateStatus(challengeId, next)
      if (previewChallenge && previewChallenge.id === challengeId) {
        setPreviewChallenge({ ...previewChallenge, status: next })
      }
      await fetchAllChallenges()
    } catch (err) {
      alert(`Error updating status: ${err.message}`)
    }
  }

  // Trigger AI Gen
  const handleTriggerAIGen = async (e) => {
    e.preventDefault()
    if (!selectedTopicForGen) {
      setGenError('Select a target topic')
      return
    }
    try {
      setGenerating(true)
      setGenError(null)
      setGenStatusText('Initializing AI question generator agent...')

      const res = await api.challenges.generate(selectedTopicForGen, {
        difficulty: genDifficulty,
        question_count: Number(genQuestionCount),
      })
      const chalId = res.challenge_id
      setGenStatusText('AI Agents generating questions with verification...')

      let count = 0
      const poll = setInterval(async () => {
        count++
        try {
          const st = await api.challenges.getStatus(chalId)
          if (st.status === 'READY') {
            clearInterval(poll)
            setGenStatusText('✨ Challenge created and ready!')
            setTimeout(async () => {
              setIsGenerateModalOpen(false)
              setGenerating(false)
              await fetchAllChallenges()
            }, 800)
          } else if (st.status === 'FAILED') {
            clearInterval(poll)
            setGenError(st.generation_error || 'Generation failed')
            setGenerating(false)
          } else {
            setGenStatusText(`AI Agent generating questions (step ${count}/30)...`)
          }
        } catch {
          if (count >= 30) {
            clearInterval(poll)
            setGenError('Generation timeout')
            setGenerating(false)
          }
        }
      }, 1500)
    } catch (err) {
      setGenError(err.message || 'Generation request failed')
      setGenerating(false)
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

  const handleCreateManual = async (e) => {
    e.preventDefault()
    if (!manualTitle.trim()) {
      setManualError('Title is required')
      return
    }
    if (!manualTopicId) {
      setManualError('Topic selection is required')
      return
    }
    for (let i = 0; i < manualQuestions.length; i++) {
      const q = manualQuestions[i]
      if (!q.prompt.trim()) {
        setManualError(`Question ${i + 1} prompt cannot be empty`)
        return
      }
      if (q.options.filter((o) => o.is_correct).length !== 1) {
        setManualError(`Question ${i + 1} must have exactly one correct option`)
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
      await fetchAllChallenges()
    } catch (err) {
      setManualError(err.message || 'Failed to create manual challenge')
    } finally {
      setManualSubmitting(false)
    }
  }

  const filteredChallenges = challenges.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.topicTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subjectName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
    const matchesOrigin = originFilter === 'ALL' || c.origin === originFilter
    return matchesSearch && matchesStatus && matchesOrigin
  })

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers className="w-6 h-6 text-purple-400" />
            Assessments & AI Arena Registry
          </h1>
          <p className="page-subtitle">
            Manage practice sets, live duel challenges, status moderation, and AI generation tasks
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="secondary"
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

      {/* Filter Controls */}
      <Card style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
          <Input
            icon={Search}
            placeholder="Search challenges by title, topic, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'READY', label: 'Ready / Published' },
              { value: 'PENDING', label: 'Pending AI Gen' },
              { value: 'PROCESSING', label: 'Processing' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
          />

          <Select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Origins' },
              { value: 'AI', label: '✨ AI Generated' },
              { value: 'TEACHER', label: '👤 Teacher Created' },
            ]}
          />
        </div>
      </Card>

      {/* Challenges Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filteredChallenges.length === 0 ? (
        <Card>
          <EmptyState
            icon={Layers}
            title="No Challenges Match Your Filters"
            description="Generate a new assessment using AI or change search filters."
            action={
              <Button
                variant="primary"
                icon={Sparkles}
                onClick={() => {
                  setGenError(null)
                  setIsGenerateModalOpen(true)
                }}
              >
                Generate AI Challenge
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
              { label: 'Origin & Type' },
              { label: 'Difficulty' },
              { label: 'Questions' },
              { label: 'Status' },
              { label: 'Actions', style: { textAlign: 'right' } },
            ]}
          >
            {filteredChallenges.map((chal) => (
              <TableRow key={chal.id}>
                <TableCell>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{chal.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Created {new Date(chal.created_at).toLocaleDateString()} • {chal.className}
                  </div>
                </TableCell>

                <TableCell>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{chal.topicTitle}</div>
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
                    <Button variant="ghost" size="sm" onClick={() => handleOpenPreview(chal.id)}>
                      Preview
                    </Button>
                    <Button
                      variant={chal.status === 'READY' ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => handleToggleStatus(chal.id, chal.status)}
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

      {/* AI Challenge Generator Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          if (!generating) setIsGenerateModalOpen(false)
        }}
        title="AI Challenge Generator"
        subtitle="Prompt the AI multi-agent system to craft verified questions."
        icon={Sparkles}
        footer={
          !generating && (
            <>
              <Button variant="secondary" onClick={() => setIsGenerateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" icon={Sparkles} onClick={handleTriggerAIGen}>
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
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
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
          <form onSubmit={handleTriggerAIGen}>
            {genError && (
              <div style={{ backgroundColor: 'var(--danger-light)', border: '1px solid var(--danger-border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--danger)', fontSize: '0.84rem', marginBottom: '16px' }}>
                {genError}
              </div>
            )}

            <Select
              label="Select Target Topic"
              required
              value={selectedTopicForGen}
              onChange={(e) => setSelectedTopicForGen(e.target.value)}
              options={
                topics.length > 0
                  ? topics.map((t) => ({
                      value: t.id,
                      label: `${t.className} → ${t.subjectName} → ${t.title}`,
                    }))
                  : [{ value: '', label: 'No topics found' }]
              }
            />

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
            <Button variant="primary" onClick={handleCreateManual} loading={manualSubmitting}>
              Publish Manual Challenge
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateManual}>
          {manualError && (
            <div style={{ backgroundColor: 'var(--danger-light)', border: '1px solid var(--danger-border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--danger)', fontSize: '0.84rem', marginBottom: '16px' }}>
              {manualError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <Input
              label="Quiz Title"
              placeholder="e.g. Weekly Math Challenge #2"
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
            options={topics.map((t) => ({
              value: t.id,
              label: `${t.className} → ${t.subjectName} → ${t.title}`,
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
                <div style={{ fontWeight: '700', fontSize: '0.84rem', color: 'var(--primary)', marginBottom: '8px' }}>
                  Question {qIdx + 1}
                </div>

                <Input
                  placeholder="Question prompt"
                  value={q.prompt}
                  onChange={(e) => {
                    const next = [...manualQuestions]
                    next[qIdx].prompt = e.target.value
                    setManualQuestions(next)
                  }}
                  style={{ marginBottom: '10px' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: opt.is_correct ? 'var(--success-light)' : '#f8f9fb',
                        border: opt.is_correct ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                      }}
                    >
                      <input
                        type="radio"
                        name={`correct-opt-global-${qIdx}`}
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
                        style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.82rem' }}
                      />
                    </div>
                  ))}
                </div>

                <Input
                  placeholder="Explanation for student (Optional)"
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
        title={previewChallenge?.title || 'Challenge Details'}
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
                onClick={() => handleToggleStatus(previewChallenge.id, previewChallenge.status)}
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
              <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.85rem' }}>
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
                    backgroundColor: opt.is_correct ? 'var(--success-light)' : 'rgba(255, 255, 255, 0.04)',
                    border: opt.is_correct ? '1px solid var(--success)' : '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.84rem',
                    color: opt.is_correct ? 'var(--success)' : 'var(--text-secondary)',
                    fontWeight: opt.is_correct ? '700' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{opt.text}</span>
                  {opt.is_correct && <Check className="w-4 h-4 text-green-600" />}
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
                <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 mt-0.5" />
                <span>Explanation: {q.explanation}</span>
              </div>
            )}
          </div>
        ))}
      </Modal>
    </div>
  )
}
