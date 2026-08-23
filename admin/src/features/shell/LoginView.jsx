import { useState } from 'react'
import { ArrowRight, ShieldCheck, Mail, KeyRound, AlertCircle, CheckCircle2, Home } from 'lucide-react'
import { useAuth } from '../../stores/AuthContext'
import { Button } from '../../components/ui/Button'

export function LoginView() {
  const { requestOtp, verifyOtp, isLoading, authError } = useAuth()
  const [identifier, setIdentifier] = useState('teacher@demo.local')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('identifier')
  const [otpSentMessage, setOtpSentMessage] = useState('')
  const [localError, setLocalError] = useState('')

  const handleRequestOtp = async (targetId = identifier) => {
    try {
      setLocalError('')
      if (!targetId.trim()) {
        setLocalError('Please enter your email or identifier')
        return
      }
      const res = await requestOtp(targetId.trim())
      setOtpSentMessage(
        res?.demo_code ? `Code sent. Demo code: ${res.demo_code}` : 'Code sent. Check your delivery channel.'
      )
      setStep('code')
    } catch (err) {
      setLocalError(err.message || 'Failed to send OTP')
    }
  }

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault()
    try {
      setLocalError('')
      if (!code.trim()) {
        setLocalError('Please enter the 6-digit OTP')
        return
      }
      await verifyOtp(identifier.trim(), code.trim())
    } catch (err) {
      setLocalError(err.message || 'Invalid or expired OTP')
    }
  }

  const handleFastLogin = async (roleEmail) => {
    setIdentifier(roleEmail)
    try {
      setLocalError('')
      const res = await requestOtp(roleEmail)
      const demoCode = res?.demo_code
      setOtpSentMessage(
        demoCode ? `Code sent. Demo code: ${demoCode}` : 'Code sent. Check your delivery channel.'
      )
      setStep('code')
      if (demoCode) {
        setCode(demoCode)
        await verifyOtp(roleEmail, demoCode)
      }
    } catch (err) {
      setLocalError(err.message || 'Quick login failed')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f5f6fa 50%, #ede9fe 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          border: '1px solid var(--border-card)',
          borderRadius: '20px',
          padding: '36px 32px',
          boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.1), 0 4px 12px -4px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)',
            }}
          >
            <Home style={{ width: '28px', height: '28px', color: '#fff' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Zehn <span style={{ color: 'var(--primary)' }}>AI</span>
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Teacher & Admin Analytics Portal
          </p>
        </div>

        {/* Error Alert */}
        {(localError || authError) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--danger-light)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              fontSize: '0.82rem',
              marginBottom: '20px',
            }}
          >
            <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>{localError || authError}</span>
          </div>
        )}

        {/* Step 1: Identifier */}
        {step === 'identifier' ? (
          <div>
            <div className="form-group">
              <label className="form-label">Teacher / Admin Email</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  style={{ width: '16px', height: '16px', color: 'var(--text-muted)', position: 'absolute', left: '12px', top: '11px' }}
                />
                <input
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="teacher@demo.local"
                  className="input"
                  style={{ paddingLeft: '38px' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                />
              </div>
            </div>

            <Button
              onClick={() => handleRequestOtp()}
              isLoading={isLoading}
              className="btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
            >
              <span>Continue with OTP</span>
              <ArrowRight style={{ width: '16px', height: '16px' }} />
            </Button>
          </div>
        ) : (
          /* Step 2: Code Verification */
          <form onSubmit={handleVerifyOtp}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--success-light)',
                border: '1px solid var(--success-border)',
                color: 'var(--success)',
                fontSize: '0.8rem',
                marginBottom: '16px',
              }}
            >
              <CheckCircle2 style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span>{otpSentMessage || 'OTP sent. Check your delivery channel.'}</span>
            </div>

            <div className="form-group">
              <label className="form-label">Enter 6-Digit OTP</label>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  style={{ width: '16px', height: '16px', color: 'var(--text-muted)', position: 'absolute', left: '12px', top: '11px' }}
                />
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="input"
                  style={{ paddingLeft: '38px', letterSpacing: '0.3em', fontSize: '1.1rem', fontWeight: '700' }}
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              className="btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
            >
              <span>Verify & Sign In</span>
              <ShieldCheck style={{ width: '16px', height: '16px' }} />
            </Button>

            <button
              type="button"
              onClick={() => setStep('identifier')}
              style={{
                width: '100%',
                marginTop: '12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textAlign: 'center',
                fontFamily: 'inherit',
              }}
            >
              ← Change email / identifier
            </button>
          </form>
        )}

        {/* Quick Demo Access Bar */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Instant Demo Evaluation Logins
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleFastLogin('teacher@demo.local')}
              disabled={isLoading}
            >
              👨‍🏫 Demo Teacher
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleFastLogin('admin@demo.local')}
              disabled={isLoading}
            >
              🛡️ Demo Admin
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
