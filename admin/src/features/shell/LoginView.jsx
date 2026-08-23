import { useState } from 'react'
import { Sparkles, ArrowRight, ShieldCheck, Mail, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react'
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
      setOtpSentMessage(res.message || `Code sent! (Demo code is 123456)`)
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
      await requestOtp(roleEmail)
      setCode('123456')
      await verifyOtp(roleEmail, '123456')
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
        background: 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 60%), #090d16',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(18, 24, 38, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          padding: '36px 32px',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 0 24px rgba(99, 102, 241, 0.5)',
            }}
          >
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#fff' }}>
            Maktab <span style={{ color: '#818cf8' }}>AI Arena</span>
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
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185',
              fontSize: '0.82rem',
              marginBottom: '20px',
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                  className="w-4 h-4 text-slate-400"
                  style={{ position: 'absolute', left: '12px', top: '11px' }}
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
              <ArrowRight className="w-4 h-4" />
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
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                fontSize: '0.8rem',
                marginBottom: '16px',
              }}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{otpSentMessage || 'OTP sent! Use demo code: 123456'}</span>
            </div>

            <div className="form-group">
              <label className="form-label">Enter 6-Digit OTP</label>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  className="w-4 h-4 text-slate-400"
                  style={{ position: 'absolute', left: '12px', top: '11px' }}
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
              <ShieldCheck className="w-4 h-4" />
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
