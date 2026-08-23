import { useState } from 'react'
import { GraduationCap, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useClass } from '../../stores/ClassContext'
import { Button } from '../../components/ui/Button'

export function JoinClassModal({ isOpen, onClose, onSuccess }) {
  const { joinClass } = useClass()
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  if (!isOpen) return null

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await joinClass(inviteCode.trim().toUpperCase())
      setSuccess('Successfully enrolled in class!')
      setTimeout(() => {
        if (onSuccess) onSuccess(res)
        onClose()
      }, 1000)
    } catch (err) {
      setError(err.message || 'Invalid or expired invite code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Join Classroom
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Enter the 8-character invite code provided by your teacher
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '16px',
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

        {success && (
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#34d399',
              fontSize: '0.82rem',
            }}
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleJoin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Invite Code
            </label>
            <input
              type="text"
              required
              maxLength={12}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. 9A-CODE"
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '1.1rem',
                fontWeight: '700',
                letterSpacing: '0.15em',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </Button>
            <Button variant="cyan" type="submit" loading={isLoading} style={{ flex: 1.5 }} icon={ArrowRight}>
              Join Class
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
