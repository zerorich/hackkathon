import { useState } from 'react'
import {
  Trophy,
  Sparkles,
  Swords,
  Flame,
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'
import { api } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

export function ResultPage({ result, onDone, onPracticeAgain }) {
  const [copied, setCopied] = useState(false)
  const [creatingDuel, setCreatingDuel] = useState(false)
  const [duelData, setDuelData] = useState(null)
  const [duelError, setDuelError] = useState(null)

  const r = result || {}
  const score = r.score !== undefined ? r.score : 0
  const accuracy = r.accuracy_percent !== undefined ? r.accuracy_percent : (r.accuracy !== undefined ? r.accuracy : 0)
  const xpAwarded = r.xp_awarded !== undefined ? r.xp_awarded : 0
  const totalXp = r.total_xp || 0
  const level = r.level || 1
  const streak = r.streak || 1
  const questions = r.question_results || r.questions || []

  const handleChallengeFriend = async () => {
    if (!r.attempt_id && !r.id) return
    setCreatingDuel(true)
    setDuelError(null)
    try {
      const attemptId = r.attempt_id || r.id
      const res = await api.post(`/attempts/${attemptId}/duels`, {})
      setDuelData(res)
    } catch (err) {
      setDuelError(err.message || 'Failed to create duel challenge')
    } finally {
      setCreatingDuel(false)
    }
  }

  const handleCopyDuel = (shareCode) => {
    const link = `${window.location.origin}/duel/${shareCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Celebration Card */}
      <Card
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.15) 100%)',
          border: '1.5px solid rgba(99, 102, 241, 0.4)',
          boxShadow: 'var(--shadow-glow)',
          padding: '36px 28px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: 'rgba(245, 158, 11, 0.2)',
            border: '2px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 25px rgba(245, 158, 11, 0.3)',
          }}
        >
          <Trophy className="w-8 h-8" />
        </div>

        <h1 style={{ fontSize: '1.7rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
          Challenge Completed!
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Great effort! Here is your performance breakdown and rewards.
        </p>

        {/* 3 Metric Pills */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '14px',
            margin: '28px 0',
          }}
        >
          {/* Score */}
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Final Score
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              {score} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 1000</span>
            </div>
          </div>

          {/* Accuracy */}
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Accuracy
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: accuracy >= 80 ? '#34d399' : '#fbbf24', fontFamily: 'var(--font-mono)' }}>
              {accuracy}%
            </div>
          </div>

          {/* XP Earned */}
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '16px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              XP Awarded
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
              +{xpAwarded} <span style={{ fontSize: '0.85rem' }}>XP</span>
            </div>
          </div>
        </div>

        {/* Streak & Level badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              fontSize: '0.82rem',
              fontWeight: '700',
            }}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            {streak} Day Streak Active
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#818cf8',
              fontSize: '0.82rem',
              fontWeight: '700',
            }}
          >
            <Zap className="w-4 h-4 text-indigo-400" />
            Level {level} ({totalXp} XP)
          </div>
        </div>

        {/* Challenge a Friend Call-to-action */}
        {!duelData ? (
          <div>
            <Button
              variant="rose"
              size="lg"
              icon={Swords}
              loading={creatingDuel}
              onClick={handleChallengeFriend}
              style={{
                background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                boxShadow: '0 4px 20px rgba(244, 63, 94, 0.4)',
              }}
            >
              Challenge a Friend to this Exact Set!
            </Button>
            {duelError && (
              <div style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '8px' }}>{duelError}</div>
            )}
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: '14px',
              padding: '18px 20px',
              maxWidth: '500px',
              margin: '0 auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <Swords className="w-5 h-5 text-rose-400" />
              <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.95rem' }}>
                Duel Ready to Share!
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Send this share code or link to your classmate:
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.3rem',
                fontWeight: '800',
                color: '#38bdf8',
                letterSpacing: '0.1em',
                marginBottom: '14px',
              }}
            >
              {duelData.share_code}
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={copied ? Check : Copy}
              onClick={() => handleCopyDuel(duelData.share_code)}
            >
              {copied ? 'Link Copied to Clipboard!' : 'Copy Duel Link'}
            </Button>
          </div>
        )}
      </Card>

      {/* Detailed Question Review */}
      <Card>
        <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px' }}>
          Detailed Question Breakdown ({questions.length})
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {questions.map((q, idx) => {
            const isCorrect = q.is_correct
            return (
              <div
                key={q.question_id || idx}
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: isCorrect
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    Question {idx + 1}
                  </span>
                  <Badge variant={isCorrect ? 'emerald' : 'rose'}>
                    {isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </Badge>
                </div>

                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '14px', fontWeight: '600' }}>
                  {q.prompt}
                </div>

                {/* Explanation text */}
                {q.explanation && (
                  <div
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.4',
                    }}
                  >
                    <strong style={{ color: '#818cf8' }}>Explanation: </strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Bottom Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '40px' }}>
        <Button variant="secondary" icon={RotateCcw} onClick={onPracticeAgain}>
          Practice Another Topic
        </Button>
        <Button variant="primary" icon={ArrowRight} onClick={onDone}>
          Return to Arena
        </Button>
      </div>
    </div>
  )
}
