import { useState, useEffect } from 'react'
import { Sparkles, Play, CheckCircle2, AlertCircle, Loader2, Zap } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

export function ChallengeIntroModal({ isOpen, topicId, topicTitle, challengeId: initialChallengeId, onClose, onStartAttempt }) {
  const [step, setStep] = useState('select') // 'select' | 'generating' | 'ready'
  const [difficulty, setDifficulty] = useState('MEDIUM')
  const [challengeId, setChallengeId] = useState(initialChallengeId || null)
  const [challengeData, setChallengeData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (initialChallengeId) {
        setChallengeId(initialChallengeId)
        loadChallenge(initialChallengeId)
      } else {
        setStep('select')
        setChallengeId(null)
        setChallengeData(null)
        setError(null)
      }
    }
  }, [isOpen, initialChallengeId])

  const loadChallenge = async (cId) => {
    try {
      const data = await api.get(`/challenges/${cId}`)
      setChallengeData(data)
      setStep('ready')
    } catch (err) {
      setError(err.message || 'Failed to load challenge')
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setStep('generating')
    try {
      const genRes = await api.post(`/topics/${topicId}/challenges/generate`, {
        difficulty,
        question_count: 5,
      })
      const newChallengeId = genRes.challenge_id || genRes.id
      setChallengeId(newChallengeId)

      // Poll status
      pollStatus(newChallengeId)
    } catch (err) {
      setError(err.message || 'Failed to generate challenge')
      setStep('select')
      setLoading(false)
    }
  }

  const pollStatus = async (cId, retries = 20) => {
    try {
      const statusRes = await api.get(`/challenges/${cId}/status`)
      if (statusRes.status === 'READY') {
        await loadChallenge(cId)
        setLoading(false)
      } else if (statusRes.status === 'FAILED') {
        setError('AI Generation encountered an issue. Please retry.')
        setStep('select')
        setLoading(false)
      } else if (retries > 0) {
        setTimeout(() => pollStatus(cId, retries - 1), 1500)
      } else {
        setError('Generation timed out. Please try again.')
        setStep('select')
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      if (retries > 0) {
        setTimeout(() => pollStatus(cId, retries - 1), 1500)
      } else {
        setError('Failed to fetch challenge status.')
        setStep('select')
        setLoading(false)
      }
    }
  }

  const handleBeginAttempt = async () => {
    if (!challengeId) return
    setLoading(true)
    try {
      const attemptRes = await api.post(`/challenges/${challengeId}/attempts`, {})
      const attemptId = attemptRes.attempt_id || attemptRes.id
      onStartAttempt(attemptId)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to start attempt')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            {topicTitle || 'AI Learning Challenge'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Interactive 5-question curriculum practice
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#f87171',
              fontSize: '0.82rem',
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Select Difficulty */}
        {step === 'select' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Select Challenge Difficulty:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {[
                  { id: 'EASY', label: 'Easy', desc: 'Foundational' },
                  { id: 'MEDIUM', label: 'Medium', desc: 'Standard' },
                  { id: 'HARD', label: 'Hard', desc: 'Advanced' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: difficulty === d.id ? '2px solid #6366f1' : '1px solid var(--border-card)',
                      backgroundColor: difficulty === d.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: difficulty === d.id ? '#818cf8' : 'var(--text-primary)' }}>
                      {d.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {d.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={onClose}>
                Cancel
              </Button>
              <Button variant="cyan" style={{ flex: 1.5 }} icon={Sparkles} onClick={handleGenerate} loading={loading}>
                Generate AI Set
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Generating */}
        {step === 'generating' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
              AI Architect is Generating Questions...
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '340px', margin: '0 auto' }}>
              Crafting 5 tailored questions with answer options and detailed explanations.
            </p>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 'ready' && (
          <div>
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Challenge Ready!
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {challengeData?.question_count || 5} Questions • Difficulty: {challengeData?.difficulty || difficulty}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Earn up to <strong style={{ color: '#818cf8' }}>100 XP</strong> and keep your daily streak alive!
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={onClose}>
                Later
              </Button>
              <Button variant="primary" style={{ flex: 1.5 }} icon={Play} onClick={handleBeginAttempt} loading={loading}>
                Start Challenge Now
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
