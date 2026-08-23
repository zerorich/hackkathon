import { useState, useEffect } from 'react'
import { BookOpen, ArrowRight, Sparkles, Target, Layers } from 'lucide-react'
import { api } from '../../lib/api'
import { useClass } from '../../stores/ClassContext'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'

export function SubjectsPage({ onNavigate, onStartPractice, selectedSubjectId = null }) {
  const { activeClass } = useClass()
  const [subjects, setSubjects] = useState([])
  const [activeSubject, setActiveSubject] = useState(null)
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingTopics, setLoadingTopics] = useState(false)

  const fetchSubjects = async () => {
    if (!activeClass) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await api.get(`/classes/${activeClass.id}/subjects`)
      const list = Array.isArray(res) ? res : []
      setSubjects(list)
      if (list.length > 0) {
        const initial = selectedSubjectId
          ? list.find((s) => s.id === selectedSubjectId) || list[0]
          : list[0]
        setActiveSubject(initial)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTopics = async (subjectId) => {
    if (!subjectId) return
    setLoadingTopics(true)
    try {
      const res = await api.get(`/subjects/${subjectId}/topics`)
      setTopics(Array.isArray(res) ? res : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingTopics(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [activeClass])

  useEffect(() => {
    if (activeSubject) {
      fetchTopics(activeSubject.id)
    }
  }, [activeSubject])

  if (loading) {
    return <LoadingSkeleton height="260px" borderRadius="18px" />
  }

  if (subjects.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={BookOpen}
          title="No Subjects Found"
          description="Your teacher hasn't published subjects for this class yet. Check back soon!"
        />
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            Curriculum & Subjects
          </h1>
          <p className="page-subtitle">
            Browse class topics, check mastery levels, and practice AI challenges
          </p>
        </div>
      </div>

      {/* Subject Tabs */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
        {subjects.map((sub) => {
          const isSel = sub.id === activeSubject?.id
          return (
            <button
              key={sub.id}
              onClick={() => setActiveSubject(sub)}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isSel ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-card)',
                border: isSel ? '1.5px solid #6366f1' : '1px solid var(--border-card)',
                color: isSel ? '#818cf8' : 'var(--text-secondary)',
                fontWeight: isSel ? '700' : '600',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              <BookOpen className="w-4 h-4" />
              {sub.name}
            </button>
          )
        })}
      </div>

      {/* Topics in active subject */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {activeSubject?.name} Topics ({topics.length})
            </h2>
            {activeSubject?.description && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {activeSubject.description}
              </p>
            )}
          </div>
        </div>

        {loadingTopics ? (
          <LoadingSkeleton height="140px" borderRadius="12px" />
        ) : topics.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No Topics in this Subject"
            description="Topics will appear here once configured by the instructor."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {topics.map((topic) => (
              <div
                key={topic.id}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-card)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <Badge
                      variant={
                        topic.difficulty === 'HARD'
                          ? 'rose'
                          : topic.difficulty === 'EASY'
                          ? 'emerald'
                          : 'amber'
                      }
                    >
                      {topic.difficulty || 'MEDIUM'}
                    </Badge>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    {topic.title}
                  </h3>
                  {topic.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {topic.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="cyan"
                    size="sm"
                    style={{ flex: 1 }}
                    icon={Sparkles}
                    onClick={() => onStartPractice(topic.id, topic.title)}
                  >
                    AI Practice
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate(`subjects-topic-${topic.id}`)}
                  >
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
