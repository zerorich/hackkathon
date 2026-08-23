import { useState, useEffect } from 'react'
import { BookOpen, Sparkles, Target, ArrowLeft, Play, Layers } from 'lucide-react'
import { api } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'

export function TopicDetailPage({ topicId, onNavigate, onStartPractice }) {
  const [topic, setTopic] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTopicData = async () => {
    setLoading(true)
    try {
      const [topicRes, challengesRes] = await Promise.all([
        api.get(`/topics/${topicId}`),
        api.get(`/topics/${topicId}/challenges`),
      ])
      setTopic(topicRes)
      setChallenges(Array.isArray(challengesRes) ? challengesRes : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopicData()
  }, [topicId])

  if (loading) {
    return <LoadingSkeleton height="300px" borderRadius="18px" />
  }

  if (!topic) {
    return (
      <Card>
        <EmptyState
          icon={BookOpen}
          title="Topic Not Found"
          description="The requested topic could not be located."
          action={
            <Button variant="secondary" icon={ArrowLeft} onClick={() => onNavigate('subjects')}>
              Back to Subjects
            </Button>
          }
        />
      </Card>
    )
  }

  const mastery = topic.mastery !== undefined ? topic.mastery : 0
  const masteryCat = topic.mastery_category || (mastery >= 90 ? 'MASTERED' : mastery >= 70 ? 'GOOD' : mastery >= 40 ? 'LEARNING' : 'WEAK')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => onNavigate('subjects')}>
          Back to Curriculum
        </Button>
      </div>

      {/* Topic Header Card */}
      <Card
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Badge variant="primary">{topic.subject?.name || 'Subject'}</Badge>
              <Badge variant={topic.difficulty === 'HARD' ? 'rose' : topic.difficulty === 'EASY' ? 'emerald' : 'amber'}>
                {topic.difficulty || 'MEDIUM'}
              </Badge>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              {topic.title}
            </h1>
            {topic.description && (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '600px', marginTop: '6px' }}>
                {topic.description}
              </p>
            )}
          </div>

          {/* Mastery pill */}
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '16px 20px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Your Mastery Level
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              {mastery}%
            </div>
            <Badge
              variant={
                masteryCat === 'MASTERED'
                  ? 'emerald'
                  : masteryCat === 'GOOD'
                  ? 'cyan'
                  : masteryCat === 'LEARNING'
                  ? 'amber'
                  : 'rose'
              }
              style={{ marginTop: '6px' }}
            >
              {masteryCat}
            </Badge>
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <Button
            variant="cyan"
            icon={Sparkles}
            onClick={() => onStartPractice(topic.id, topic.title)}
          >
            Start New AI Challenge (5 Qs)
          </Button>
        </div>
      </Card>

      {/* Existing Challenges List */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Available Practice Challenges ({challenges.length})
            </h2>
          </div>
        </div>

        {challenges.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No Challenges Created Yet"
            description="Click 'Start New AI Challenge' above to have our AI generate a customized set for this topic!"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {challenges.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-card)',
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {c.question_count || 5} Questions • {c.difficulty || 'MEDIUM'} • Origin: {c.origin}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={Play}
                  onClick={() => onStartPractice(topic.id, topic.title, c.id)}
                >
                  Start Attempt
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
