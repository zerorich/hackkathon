import { useState, useEffect } from 'react'
import {
  Sparkles,
  Flame,
  Swords,
  Trophy,
  BookOpen,
  ArrowRight,
  Zap,
  Target,
  Clock,
  CheckCircle2,
  GraduationCap,
  Play,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../stores/AuthContext'
import { useClass } from '../../stores/ClassContext'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { JoinClassModal } from '../auth/JoinClassModal'

export function DashboardPage({ onNavigate, onStartPractice }) {
  const { user } = useAuth()
  const { activeClass } = useClass()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showJoinModal, setShowJoinModal] = useState(false)

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const data = await api.get('/me/dashboard')
      setDashboardData(data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [activeClass])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <LoadingSkeleton height="180px" borderRadius="18px" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <LoadingSkeleton height="240px" borderRadius="18px" />
          <LoadingSkeleton height="240px" borderRadius="18px" />
        </div>
      </div>
    )
  }

  const d = dashboardData || {}
  const profile = d.profile || user || {}
  const totalXp = d.total_xp || profile.total_xp || 0
  const level = d.level || profile.level || 1
  const currentStreak = d.current_streak || profile.streak || 0
  const currentLevelXp = d.current_level_xp || (totalXp % 500)
  const nextLevelXp = d.next_level_xp || 500
  const xpPercent = Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100))
  const recommended = d.recommended_topic
  const subjects = d.subjects || []
  const leaderboardPreview = d.leaderboard_preview || {}
  const activeDuels = d.active_duels || []
  const recentActivity = d.recent_activity || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Banner */}
      <Card
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: 'var(--shadow-glow)',
          padding: '28px 32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
          }}
        >
          {/* Left: User Avatar & Level */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '20px',
                backgroundColor: 'rgba(99, 102, 241, 0.25)',
                border: '2px solid rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)',
              }}
            >
              {profile.avatar_url || '⚡'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>
                  {profile.display_name || 'Champion Student'}
                </h1>
                <Badge variant="primary">Level {level}</Badge>
                {d.class && (
                  <Badge variant="cyan">
                    <GraduationCap className="w-3 h-3" />
                    {d.class.name}
                  </Badge>
                )}
              </div>

              {/* XP Progress */}
              <div style={{ width: '280px', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Level {level} Progress</span>
                  <span style={{ color: '#818cf8', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                    {currentLevelXp} / {nextLevelXp} XP
                  </span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${xpPercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Streak & Quick stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Streak card */}
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '16px',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div className="flame-anim">
                <Flame className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                  {currentStreak} <span style={{ fontSize: '0.85rem' }}>Days</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Active Streak
                </div>
              </div>
            </div>

            {/* Total XP */}
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '16px',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <Zap className="w-7 h-7 text-indigo-400" />
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                  {totalXp}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total XP Earned
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Grid: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Recommended Practice Topic */}
          {recommended ? (
            <Card style={{ border: '1px solid rgba(6, 182, 212, 0.3)', backgroundColor: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target className="w-5 h-5 text-cyan-400" />
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.05em' }}>
                    Recommended Practice
                  </span>
                </div>
                <Badge
                  variant={
                    recommended.mastery_category === 'WEAK'
                      ? 'rose'
                      : recommended.mastery_category === 'LEARNING'
                      ? 'amber'
                      : 'emerald'
                  }
                >
                  {recommended.mastery_category || 'PRACTICE'}
                </Badge>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {recommended.title}
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {recommended.subject_name ? `Subject: ${recommended.subject_name}` : 'Core Curriculum Topic'}
                  {recommended.mastery !== undefined && ` • Mastery: ${recommended.mastery}%`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant="cyan"
                  icon={Play}
                  onClick={() => onStartPractice(recommended.id, recommended.title)}
                >
                  Start AI Practice (5 Qs)
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onNavigate(`subjects-topic-${recommended.id}`)}
                >
                  Topic Details →
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon={BookOpen}
                title="Explore Curriculum Subjects"
                description="Pick a subject and topic to begin your personalized AI learning challenge."
                action={
                  <Button variant="primary" icon={BookOpen} onClick={() => onNavigate('subjects')}>
                    Browse Subjects
                  </Button>
                }
              />
            </Card>
          )}

          {/* Subjects Grid Overview */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Your Subjects ({subjects.length})
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('subjects')}>
                View All →
              </Button>
            </div>

            {subjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                No subjects assigned yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {subjects.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => onNavigate(`subjects-${sub.id}`)}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {sub.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      {sub.topic_count || 0} Lessons & Topics
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#818cf8' }}>
                      <span>Practice</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Leaderboard & Duels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Leaderboard Preview */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Class Leaderboard
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('leaderboard')}>
                Full Board →
              </Button>
            </div>

            {leaderboardPreview.entries && leaderboardPreview.entries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leaderboardPreview.entries.slice(0, 4).map((entry, idx) => {
                  const isCur = entry.is_current_user
                  const rankColors = ['#f59e0b', '#94a3b8', '#b45309']
                  return (
                    <div
                      key={entry.user?.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        backgroundColor: isCur ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: isCur ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: idx < 3 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                            color: idx < 3 ? rankColors[idx] : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '0.8rem',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {entry.rank || idx + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.88rem', color: isCur ? '#818cf8' : 'var(--text-primary)' }}>
                            {entry.user?.display_name || 'Student'} {isCur && '(You)'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Level {entry.user?.level || 1} • Streak {entry.current_streak || 0}d
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                          {entry.total_xp || 0} XP
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Complete challenges to earn XP and rank on the class leaderboard.
              </div>
            )}
          </Card>

          {/* Active Duels Widget */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Swords className="w-5 h-5 text-rose-400" />
                <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Active Duels ({activeDuels.length})
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('duels')}>
                View All →
              </Button>
            </div>

            {activeDuels.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeDuels.slice(0, 3).map((duel) => (
                  <div
                    key={duel.id}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {duel.challenge_title || 'Math Arena Duel'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Status: {duel.status}
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onNavigate(`duels-view-${duel.id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  No active duels. Finish a practice challenge to challenge your classmates!
                </p>
                <Button variant="secondary" size="sm" icon={Swords} onClick={() => onNavigate('duels')}>
                  Go to Duels Hub
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      <JoinClassModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
    </div>
  )
}
