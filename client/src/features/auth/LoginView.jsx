import { useState } from 'react'
import { Sparkles, ArrowRight, ShieldCheck, KeyRound, Mail, AlertCircle } from 'lucide-react'
import { useAuth } from '../../stores/AuthContext'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

export function LoginView() {
  const { requestOtp, verifyOtp } = useAuth()
  const [step, setStep] = useState('request') // 'request' | 'verify'
  const [identifier, setIdentifier] = useState('student1@demo.local')
  const [otpCode, setOtpCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      await requestOtp(identifier.trim())
      setStep('verify')
      setOtpCode('123456') // Pre-fill demo code for seamless UX
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otpCode.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      await verifyOtp(identifier.trim(), otpCode.trim())
    } catch (err) {
      setError(err.message || 'Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px 32px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 25px rgba(99, 102, 241, 0.45)',
            }}
          >
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#fff' }}>
            Maktab <span style={{ color: '#818cf8' }}>AI Arena</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            {step === 'request' ? 'Student Interactive Learning & Duels' : 'Enter 6-digit confirmation code'}
          </p>
        </div>

        {/* Demo Mode Notice */}
        <div
          style={{
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span style={{ fontSize: '0.78rem', color: '#c7d2fe', fontWeight: '600' }}>
              Demo Mode Active
            </span>
          </div>
          <Badge variant="cyan">Code: 123456</Badge>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#f87171',
              fontSize: '0.82rem',
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Step 1: Request OTP */}
        {step === 'request' && (
          <form onSubmit={handleRequestOtp}>
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                }}
              >
                Student Email or Phone
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="student1@demo.local"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                  }}
                />
                <Mail
                  className="w-4 h-4"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
              </div>
            </div>

            {/* Quick student selectors */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Quick demo accounts:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['student1@demo.local', 'student2@demo.local', 'student3@demo.local'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setIdentifier(s)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: identifier === s ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: identifier === s ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                      color: identifier === s ? '#818cf8' : 'var(--text-muted)',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    {s.split('@')[0]}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" variant="primary" loading={isLoading} style={{ width: '100%' }} icon={ArrowRight}>
              Continue with OTP
            </Button>
          </form>
        )}

        {/* Form Step 2: Verify OTP */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Enter Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#818cf8',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Change Account
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    letterSpacing: '0.25em',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <KeyRound
                  className="w-4 h-4"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
              </div>
            </div>

            <Button type="submit" variant="primary" loading={isLoading} style={{ width: '100%' }} icon={Sparkles}>
              Verify & Enter Arena
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
