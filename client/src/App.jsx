import { useState } from 'react'
import { AuthProvider, useAuth } from './stores/AuthContext'
import { ClassProvider } from './stores/ClassContext'
import { Navbar } from './features/shell/Navbar'
import { LoginView } from './features/auth/LoginView'
import { OnboardingModal } from './features/auth/OnboardingModal'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { SubjectsPage } from './features/curriculum/SubjectsPage'
import { TopicDetailPage } from './features/curriculum/TopicDetailPage'
import { ChallengeIntroModal } from './features/attempt/ChallengeIntroModal'
import { AttemptFlowPage } from './features/attempt/AttemptFlowPage'
import { ResultPage } from './features/attempt/ResultPage'
import { DuelsPage } from './features/duels/DuelsPage'
import { DuelAcceptPage } from './features/duels/DuelAcceptPage'
import { LeaderboardPage } from './features/leaderboard/LeaderboardPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { Loader2 } from 'lucide-react'

function StudentApp() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [currentRoute, setCurrentRoute] = useState('dashboard')

  // Practice modal state
  const [practiceTopic, setPracticeTopic] = useState(null) // { id, title, challengeId }
  const [activeAttemptId, setActiveAttemptId] = useState(null)
  const [activeResult, setActiveResult] = useState(null)
  const [acceptDuelCode, setAcceptDuelCode] = useState(null)

  const navigateTo = (route) => {
    setCurrentRoute(route)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleStartPractice = (topicId, topicTitle, challengeId = null) => {
    setPracticeTopic({ id: topicId, title: topicTitle, challengeId })
  }

  const handleStartAttempt = (attemptId) => {
    setActiveAttemptId(attemptId)
    navigateTo(`attempt-${attemptId}`)
  }

  const handleFinishAttempt = (result) => {
    setActiveResult(result)
    navigateTo('result')
  }

  const handleAcceptDuel = (shareCode) => {
    setAcceptDuelCode(shareCode)
    navigateTo(`duel-accept-${shareCode}`)
  }

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-app)',
          gap: '16px',
        }}
      >
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Entering Maktab AI Arena...
        </span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginView />
  }

  const renderPage = () => {
    // Attempt flow
    if (currentRoute.startsWith('attempt-') && activeAttemptId) {
      return (
        <AttemptFlowPage
          attemptId={activeAttemptId}
          onFinish={handleFinishAttempt}
          onCancel={() => navigateTo('dashboard')}
        />
      )
    }

    // Result screen
    if (currentRoute === 'result' && activeResult) {
      return (
        <ResultPage
          result={activeResult}
          onDone={() => navigateTo('dashboard')}
          onPracticeAgain={() => navigateTo('subjects')}
        />
      )
    }

    // Duel accept page
    if (currentRoute.startsWith('duel-accept-') && acceptDuelCode) {
      return (
        <DuelAcceptPage
          shareCode={acceptDuelCode}
          onStartAttempt={handleStartAttempt}
          onBack={() => navigateTo('duels')}
        />
      )
    }

    // Topic detail
    if (currentRoute.startsWith('subjects-topic-')) {
      const topicId = currentRoute.replace('subjects-topic-', '')
      return (
        <TopicDetailPage
          topicId={topicId}
          onNavigate={navigateTo}
          onStartPractice={handleStartPractice}
        />
      )
    }

    // Subjects with preselected subject
    if (currentRoute.startsWith('subjects-')) {
      const subjectId = currentRoute.replace('subjects-', '')
      return (
        <SubjectsPage
          selectedSubjectId={subjectId}
          onNavigate={navigateTo}
          onStartPractice={handleStartPractice}
        />
      )
    }

    switch (currentRoute) {
      case 'dashboard':
        return <DashboardPage onNavigate={navigateTo} onStartPractice={handleStartPractice} />
      case 'subjects':
        return <SubjectsPage onNavigate={navigateTo} onStartPractice={handleStartPractice} />
      case 'duels':
        return <DuelsPage onNavigate={navigateTo} onAcceptDuel={handleAcceptDuel} />
      case 'leaderboard':
        return <LeaderboardPage />
      case 'profile':
        return <ProfilePage onNavigate={navigateTo} />
      default:
        return <DashboardPage onNavigate={navigateTo} onStartPractice={handleStartPractice} />
    }
  }

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar currentRoute={currentRoute} onNavigate={navigateTo} />

      {/* Main Content Area */}
      <main className="main-content">{renderPage()}</main>

      {/* Onboarding modal if not completed */}
      {user && !user.onboarding_completed && (
        <OnboardingModal isOpen={true} onClose={() => {}} />
      )}

      {/* Challenge practice generator modal */}
      {practiceTopic && (
        <ChallengeIntroModal
          isOpen={true}
          topicId={practiceTopic.id}
          topicTitle={practiceTopic.title}
          challengeId={practiceTopic.challengeId}
          onClose={() => setPracticeTopic(null)}
          onStartAttempt={handleStartAttempt}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ClassProvider>
        <StudentApp />
      </ClassProvider>
    </AuthProvider>
  )
}
