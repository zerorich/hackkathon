import { useState, useEffect } from 'react'
import {
  Swords,
  Trophy,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../stores/AuthContext'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'

export function DuelsPage({ onNavigate, onAcceptDuel }) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'completed'
  const [duels, setDuels] = useState([])
  const [loading, setLoading] = useState(true)
  const [customShareCode, setCustomShareCode] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [selectedDuel, setSelectedDuel] = useState(null)

  const fetchDuels = async () => {
    setLoading(true)
    try {
      const res = await api.get('/me/duels')
      setDuels(res.items || (Array.isArray(res) ? res : res.duels || []))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDuels()
  }, [])

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredDuels = duels.filter((d) =>
    activeTab === 'active' ? d.status !== 'COMPLETED' : d.status === 'COMPLETED'
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Swords className="w-6 h-6 text-rose-400" />
            Class Duels Arena
          </h1>
          <p className="page-subtitle">
            Challenge classmates on identical question sets, climb rankings, and win bonus +30 XP!
          </p>
        </div>

        {/* Enter Code quick box */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Enter Share Code..."
            value={customShareCode}
            onChange={(e) => setCustomShareCode(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
            }}
          />
          <Button
            variant="rose"
            size="sm"
            disabled={!customShareCode.trim()}
            onClick={() => onAcceptDuel(customShareCode.trim())}
            style={{
              background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
            }}
          >
            Accept Duel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: activeTab === 'active' ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
            border: activeTab === 'active' ? '1px solid rgba(244, 63, 94, 0.3)' : 'none',
            color: activeTab === 'active' ? '#fb7185' : 'var(--text-secondary)',
            fontWeight: '700',
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          Active & Pending Duels
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: activeTab === 'completed' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            border: activeTab === 'completed' ? '1px solid rgba(99, 102, 241, 0.3)' : 'none',
            color: activeTab === 'completed' ? '#818cf8' : 'var(--text-secondary)',
            fontWeight: '700',
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          Battle History (Completed)
        </button>
      </div>

      {/* Duels List */}
      {loading ? (
        <LoadingSkeleton height="200px" borderRadius="18px" />
      ) : filteredDuels.length === 0 ? (
        <Card>
          <EmptyState
            icon={Swords}
            title={activeTab === 'active' ? 'No Active Duels' : 'No Completed Duels'}
            description="Finish any practice challenge on the dashboard, then click 'Challenge a Friend' to launch a duel!"
            action={
              <Button variant="primary" onClick={() => onNavigate('dashboard')}>
                Go to Practice
              </Button>
            }
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredDuels.map((duel) => {
            const isCompleted = duel.status === 'COMPLETED'
            const isWinner =
              duel.winner_id === user?.id ||
              duel.winner_user_id === user?.id ||
              (duel.is_challenger && duel.result_type === 'CREATOR_WIN') ||
              (!duel.is_challenger && duel.result_type === 'OPPONENT_WIN')
            const isDraw = duel.result_type === 'DRAW' || duel.winner_id === 'DRAW' || duel.winner_user_id === 'DRAW'
            const isCreator = duel.is_challenger ?? (duel.creator_id === user?.id || duel.creator_user_id === user?.id)

            return (
              <Card
                key={duel.id}
                style={{
                  border: isCompleted
                    ? isWinner
                      ? '1px solid rgba(16, 185, 129, 0.4)'
                      : isDraw
                      ? '1px solid rgba(245, 158, 11, 0.3)'
                      : '1px solid rgba(244, 63, 94, 0.3)'
                    : '1px solid var(--border-card)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Swords className="w-5 h-5 text-rose-400" />
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {duel.challenge_title || 'Curriculum Duel'}
                    </span>
                  </div>

                  <Badge
                    variant={
                      isCompleted
                        ? isWinner
                          ? 'emerald'
                          : isDraw
                          ? 'amber'
                          : 'rose'
                        : 'primary'
                    }
                  >
                    {isCompleted ? (isWinner ? 'Victory' : isDraw ? 'Draw' : 'Defeat') : duel.status}
                  </Badge>
                </div>

                {/* Duel info */}
                <div
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Challenger:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                      {isCreator ? 'You' : duel.creator_display_name || 'Classmate'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Opponent:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                      {!isCreator ? 'You' : duel.opponent_display_name || 'Waiting for opponent...'}
                    </span>
                  </div>

                  {!isCompleted && duel.share_code && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#38bdf8' }}>
                        {duel.share_code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(duel.share_code, duel.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copiedId === duel.id ? '#34d399' : 'var(--text-muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {copiedId === duel.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === duel.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Action */}
                {!isCompleted && !isCreator && (
                  <Button
                    variant="rose"
                    size="sm"
                    style={{ width: '100%' }}
                    onClick={() => onAcceptDuel(duel.share_code)}
                  >
                    Accept Challenge Now →
                  </Button>
                )}

                {isCompleted && (
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: isWinner ? '#34d399' : 'var(--text-muted)' }}>
                    {isWinner ? '🎉 +30 Winner XP Bonus awarded!' : 'Challenge completed.'}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
