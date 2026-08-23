import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TeacherClassProvider } from "./context/TeacherClassContext";
import { ProtectedRoute, GuestRoute, RoleRoute, homePathFor } from "./components/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import { TeacherShell } from "./components/TeacherShell";
import { LoadingView } from "./components/StateViews";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import VerifyPage from "./pages/VerifyPage";
import OnboardingPage from "./pages/OnboardingPage";
import JoinPage from "./pages/JoinPage";
import DashboardPage from "./pages/DashboardPage";
import AiChatPage from "./pages/AiChatPage";
import SubjectsPage from "./pages/SubjectsPage";
import SubjectDetailPage from "./pages/SubjectDetailPage";
import TopicDetailPage from "./pages/TopicDetailPage";
import ChallengeIntroPage from "./pages/ChallengeIntroPage";
import AttemptPage from "./pages/AttemptPage";
import ResultPage from "./pages/ResultPage";
import DuelInvitePage from "./pages/duel/DuelInvitePage";
import DuelsPage from "./pages/duel/DuelsPage";
import DuelDetailPage from "./pages/duel/DuelDetailPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";

import TeacherDashboardPage from "./pages/teacher/TeacherDashboardPage";
import TeacherClassesPage from "./pages/teacher/TeacherClassesPage";
import TeacherClassDetailPage from "./pages/teacher/TeacherClassDetailPage";
import TeacherSubjectDetailPage from "./pages/teacher/TeacherSubjectDetailPage";
import TeacherTopicPage from "./pages/teacher/TeacherTopicPage";
import TeacherStudentDetailPage from "./pages/teacher/TeacherStudentDetailPage";
import TeacherAnalyticsPage from "./pages/teacher/TeacherAnalyticsPage";
import TeacherActivityPage from "./pages/teacher/TeacherActivityPage";

function RootRedirect() {
  const { status, user } = useAuth();
  if (status === "loading") return <LoadingView />;
  return <Navigate to={status === "authenticated" ? homePathFor(user) : "/welcome"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route element={<GuestRoute />}>
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify" element={<VerifyPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* -------- Student app -------- */}
          <Route element={<RoleRoute role="STUDENT" />}>
            <Route element={<AppShell />}>
              <Route path="/join" element={<JoinPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/ai" element={<AiChatPage />} />
              <Route path="/subjects" element={<SubjectsPage />} />
              <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
              <Route path="/topics/:topicId" element={<TopicDetailPage />} />
              <Route path="/challenge/:challengeId" element={<ChallengeIntroPage />} />
              <Route path="/attempt/:attemptId" element={<AttemptPage />} />
              <Route path="/attempt/:attemptId/result" element={<ResultPage />} />
              <Route path="/duel/:shareCode" element={<DuelInvitePage />} />
              <Route path="/duels" element={<DuelsPage />} />
              <Route path="/duels/:duelId" element={<DuelDetailPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* -------- Teacher app -------- */}
          <Route element={<RoleRoute role="TEACHER" />}>
            <Route
              element={
                <TeacherClassProvider>
                  <TeacherShell />
                </TeacherClassProvider>
              }
            >
              <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
              <Route path="/teacher/classes" element={<TeacherClassesPage />} />
              <Route path="/teacher/classes/:classId" element={<TeacherClassDetailPage />} />
              <Route path="/teacher/classes/:classId/subjects/:subjectId" element={<TeacherSubjectDetailPage />} />
              <Route path="/teacher/classes/:classId/students/:studentId" element={<TeacherStudentDetailPage />} />
              <Route path="/teacher/topics/:topicId" element={<TeacherTopicPage />} />
              <Route path="/teacher/analytics" element={<TeacherAnalyticsPage />} />
              <Route path="/teacher/activity" element={<TeacherActivityPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
