import { AuthProvider, useAuth } from './stores/AuthContext'
import { ClassProvider } from './stores/ClassContext'
import { AppShell } from './features/shell/AppShell'
import { LoginView } from './features/shell/LoginView'
import { Loader2 } from 'lucide-react'

function RootApp() {
  const { isAuthenticated, isLoading } = useAuth()

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
        <Loader2 style={{ width: '32px', height: '32px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Connecting to Maktab AI Arena...
        </span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginView />
  }

  return (
    <ClassProvider>
      <AppShell />
    </ClassProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  )
}
