import { useState, useEffect } from 'react'
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import { api } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'

export function AttemptFlowPage({ attemptId, onFinish, onCancel }) {
  const [attempt, setAttempt] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({}) // { questionId: selectedOptionId }
  const [savingAnswer, setSavingAnswer] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showConfirmFinish, setShowConfirmFinish] = useState(false)

  const fetchAttempt = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/attempts/${attemptId}`)
      setAttempt(res)
      // Pre-fill answers if any exist
      if (res.answers) {
        const initial = {}
        res.answers.forEach((ans) => {
          if (ans.selected_option_id) {
            initial[ans.question_id] = ans.selected_option_id
          }
        })
        setSelectedAnswers(initial)
      }
    } catch (err) {
      setError(err.message || 'Failed to load attempt')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttempt()
  }, [attemptId])

  const handleSelectOption = async (questionId, optionId) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }))
    setSavingAnswer(true)
    try {
      await api.put(`/attempts/${attemptId}/answers/${questionId}`, {
        selected_option_id: optionId,
      })
    } catch (err) {
      console.warn('Failed to auto-save answer:', err)
    } finally {
      setSavingAnswer(false)
    }
  }

  const handleFinishAttempt = async () => {
    if (finishing) return
    setFinishing(true)
    setError(null)
    try {
      const result = await api.post(`/attempts/${attemptId}/finish`, {})
      onFinish(result)
    } catch (err) {
      setError(err.message || 'Failed to submit attempt')
      setFinishing(false)
      setShowConfirmFinish(false)
    }
  }

  if (loading) {
    return <LoadingSkeleton height="350px" borderRadius="18px" />
  }

  if (error && !attempt) {
    return (
      <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
        <AlertCircle className="w-12 h-12 text-rose-500" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Failed to Load Challenge
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>{error}</p>
        <Button variant="secondary" onClick={onCancel}>
          Return to Arena
        </Button>
      </Card>
    )
  }

  const questions = attempt?.challenge?.questions || attempt?.questions || []
  const totalQuestions = questions.length
  const currentQuestion = questions[currentIndex] || {}
  const selectedOptionId = selectedAnswers[currentQuestion.id]
  const answeredCount = Object.keys(selectedAnswers).length
  const progressPercent = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Bar: Progress & Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onCancel}>
          Exit
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Answered: <strong style={{ color: '#38bdf8' }}>{answeredCount}</strong> / {totalQuestions}
          </span>
          <Badge variant="primary">
            Question {currentIndex + 1} of {totalQuestions}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Question Stepper Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '6px 0' }}>
        {questions.map((q, idx) => {
          const isAnswered = !!selectedAnswers[q.id]
          const isCurrent = idx === currentIndex
          return (
            <button
              key={q.id || idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: isCurrent
                  ? '2px solid #6366f1'
                  : isAnswered
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid var(--border-subtle)',
                backgroundColor: isCurrent
                  ? 'rgba(99, 102, 241, 0.25)'
                  : isAnswered
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(255, 255, 255, 0.03)',
                color: isCurrent
                  ? '#818cf8'
                  : isAnswered
                  ? '#34d399'
                  : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {idx + 1}
            </button>
          )
        })}
      </div>

      {/* Question Card */}
      <Card style={{ padding: '32px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Badge variant="cyan">Question {currentIndex + 1}</Badge>
          {savingAnswer && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.5', marginBottom: '24px' }}>
          {currentQuestion.prompt}
        </h2>

        {/* Options List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(currentQuestion.options || []).map((opt, optIdx) => {
            const isSelected = selectedOptionId === opt.id
            const letter = String.fromCharCode(65 + optIdx)
            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected ? '2px solid #6366f1' : '1px solid var(--border-card)',
                  boxShadow: isSelected ? '0 0 15px rgba(99, 102, 241, 0.25)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.06)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    fontWeight: '800',
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {letter}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: isSelected ? '600' : '500', color: 'var(--text-primary)', flex: 1 }}>
                  {opt.text}
                </div>
              </div>
            )
          })}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <Button
            variant="secondary"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            icon={ArrowLeft}
          >
            Previous
          </Button>

          {currentIndex < totalQuestions - 1 ? (
            <Button
              variant="primary"
              onClick={() => setCurrentIndex((prev) => prev + 1)}
            >
              Next Question <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="emerald"
              icon={CheckCircle2}
              onClick={() => setShowConfirmFinish(true)}
            >
              Finish Challenge
            </Button>
          )}
        </div>
      </Card>

      {/* Confirmation Modal */}
      {showConfirmFinish && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <CheckCircle2 className="w-12 h-12 text-emerald-400" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              Submit Your Challenge?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '8px 0 20px' }}>
              You answered <strong style={{ color: '#38bdf8' }}>{answeredCount}</strong> out of {totalQuestions} questions.
              Your results and XP will be calculated immediately.
            </p>

            {error && (
              <div style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '16px' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="ghost" style={{ flex: 1 }} disabled={finishing} onClick={() => setShowConfirmFinish(false)}>
                Review Answers
              </Button>
              <Button
                variant="primary"
                style={{ flex: 1.5 }}
                loading={finishing}
                onClick={handleFinishAttempt}
                icon={CheckCircle2}
              >
                Submit & See Score
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
