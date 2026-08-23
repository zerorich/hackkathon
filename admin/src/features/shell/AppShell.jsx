import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { DashboardPage } from '../analytics/pages/DashboardPage'
import { AnalyticsOverviewPage } from '../analytics/pages/AnalyticsOverviewPage'
import { TopicsAnalyticsPage } from '../analytics/pages/TopicsAnalyticsPage'
import { TopicDetailPage } from '../analytics/pages/TopicDetailPage'
import { StudentsAnalyticsPage } from '../analytics/pages/StudentsAnalyticsPage'
import { StudentDetailPage } from '../analytics/pages/StudentDetailPage'
import { LeaderboardPage } from '../analytics/pages/LeaderboardPage'
import { ActivityPage } from '../analytics/pages/ActivityPage'
import { AiJobsPage } from '../analytics/pages/AiJobsPage'
import { ClassesPage } from '../classes/ClassesPage'
import { ClassDetailPage } from '../classes/ClassDetailPage'
import { SubjectsPage } from '../subjects/SubjectsPage'
import { ChallengesPage } from '../challenges/ChallengesPage'
import { AdminUsersPage } from '../admin/AdminUsersPage'
import { useClass } from '../../stores/ClassContext'

export function AppShell() {
  const [currentRoute, setCurrentRoute] = useState('classes')
  const { refreshClasses, loadingClasses } = useClass()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleRefresh = async () => {
    await refreshClasses()
    setRefreshTrigger((prev) => prev + 1)
  }

  const navigateTo = (route) => {
    setCurrentRoute(route)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderContent = () => {
    if (currentRoute.startsWith('class-detail-')) {
      const classId = currentRoute.replace('class-detail-', '')
      return <ClassDetailPage key={`${classId}-${refreshTrigger}`} classId={classId} onNavigate={navigateTo} />
    }

    if (currentRoute.startsWith('analytics-topic-')) {
      const topicId = currentRoute.replace('analytics-topic-', '')
      return <TopicDetailPage key={`${topicId}-${refreshTrigger}`} topicId={topicId} onNavigate={navigateTo} />
    }

    if (currentRoute.startsWith('analytics-student-')) {
      const userId = currentRoute.replace('analytics-student-', '')
      return <StudentDetailPage key={`${userId}-${refreshTrigger}`} userId={userId} onNavigate={navigateTo} />
    }

    switch (currentRoute) {
      // Aziz Part A Management Routes
      case 'classes':
        return <ClassesPage key={`classes-${refreshTrigger}`} onNavigate={navigateTo} />
      case 'subjects':
        return <SubjectsPage key={`subjects-${refreshTrigger}`} onNavigate={navigateTo} />
      case 'challenges':
        return <ChallengesPage key={`challenges-${refreshTrigger}`} onNavigate={navigateTo} />
      case 'admin-users':
        return <AdminUsersPage key={`admin-users-${refreshTrigger}`} />

      // Muhammad Ali Part B Analytics Routes
      case 'dashboard':
        return <DashboardPage key={`dash-${refreshTrigger}`} onNavigate={navigateTo} />
      case 'analytics':
        return <AnalyticsOverviewPage key={`overview-${refreshTrigger}`} onNavigate={navigateTo} />
      case 'analytics-topics':
        return <TopicsAnalyticsPage key={`topics-${refreshTrigger}`} onNavigate={navigateTo} />
      case 'analytics-students':
        return <StudentsAnalyticsPage key={`students-${refreshTrigger}`} onNavigate={navigateTo} />
      case 'leaderboard':
        return <LeaderboardPage key={`leaderboard-${refreshTrigger}`} onNavigate={navigateTo} />
      case 'activity':
        return <ActivityPage key={`activity-${refreshTrigger}`} onNavigate={navigateTo} />
      case 'ai-jobs':
        return <AiJobsPage key={`aijobs-${refreshTrigger}`} />
      default:
        return <ClassesPage key={`classes-${refreshTrigger}`} onNavigate={navigateTo} />
    }
  }

  return (
    <div className="app-layout">
      {/* Fixed Sidebar */}
      <Sidebar currentRoute={currentRoute} onNavigate={navigateTo} />

      {/* Main Content Area */}
      <div className="main-content">
        <Topbar onRefresh={handleRefresh} isRefreshing={loadingClasses} />
        <main>{renderContent()}</main>
      </div>
    </div>
  )
}
