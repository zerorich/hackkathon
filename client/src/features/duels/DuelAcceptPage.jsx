import { useState, useEffect } from 'react'
import { Swords, ArrowLeft, Play, AlertCircle, CheckCircle2, Trophy, Clock } from 'lucide-react'
import { api } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'

export function DuelAcceptPage({ shareCode, onStartAttempt, onBack }) {
  const [duel, setDuel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState(null)

  const fetchDuelInfo = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/duels/code/${shareCode}`)
      setDuel(res)
    } catch (err) {
      setError(err.message || 'Duel invite code not found or expired')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (shareCode) {
      fetchDuelInfo()
    }
  }, [shareCode])

  const handleAcceptDuel = async () => {
    setAccepting(true)
    setError(null)
    try {
      const res = await api.post(`/duels/code/${shareCode}/accept`, {})
      const attemptId = res.opponent_attempt_id || res.attempt_id || res.id
      onStartAttempt(attemptId)
    } catch (err) {
      setError(err.message || 'Failed to accept duel')
      setAccepting(false)
    }
  }

  if (loading) {
    return <LoadingSkeleton height="300px" borderRadius="18px" />
  }

  if (error || !duel) {
    return (
      <Card style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center', padding: '36px' }}>
        <AlertCircle className="w-12 h-12 text-rose-500" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Invalid or Expired Duel
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
          {error || 'This duel code does not exist or has already been accepted.'}
        </p>
        <Button variant="secondary" icon={ArrowLeft} onClick={onBack}>
          Back to Duels Hub
        </Button>
      </Card>
    )
  }

  return (
    <div style={{ maxWidth: '560px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack}>
          Back to Duels
        </Button>
      </div>

      <Card
        style={{
          background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(99, 102, 241, 0.12) 100%)',
          border: '1.5px solid rgba(244, 63, 94, 0.35)',
          boxShadow: '0 0 30px rgba(244, 63, 94, 0.2)',
          textAlign: 'center',
          padding: '36px 30px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: 'rgba(244, 63, 94, 0.2)',
            border: '2px solid rgba(244, 63, 94, 0.4)',
            color: '#fb7185',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 25px rgba(244, 63, 94, 0.4)',
          }}
        >
          <Swords className="w-8 h-8" />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
          You've Been Challenged to a Duel!
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Solve the identical set of questions faster and with higher accuracy to claim victory!
        </p>

        {/* Challenger card */}
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '14px',
            padding: '16px',
            margin: '24px 0',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Challenger:</span>
            <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#818cf8' }}>
              {duel.challenger?.display_name || duel.creator_display_name || 'Classmate'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Topic:</span>
            <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {duel.topic_title || duel.challenge_title || 'AI Challenge'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Reward:</span>
            <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#34d399' }}>
              +30 XP Winner Bonus
            </span>
          </div>
        </div>

        <Button
          variant="rose"
          size="lg"
          icon={Play}
          loading={accepting}
          onClick={handleAcceptDuel}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
            boxShadow: '0 6px 25px rgba(244, 63, 94, 0.45)',
          }}
        >
          Accept Duel & Begin Questions
        </Button>
      </Card>
    </div>
  )
}
