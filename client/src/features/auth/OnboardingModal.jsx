import { useState } from 'react'
import { Sparkles, User, Check } from 'lucide-react'
import { useAuth } from '../../stores/AuthContext'
import { Button } from '../../components/ui/Button'

const AVATARS = ['🚀', '⚡', '🦁', '🦉', '🎯', '🔥', '💎', '🌟']

export function OnboardingModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth()
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar_url || '⚡')
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!displayName.trim()) return
    setIsLoading(true)
    try {
      await updateProfile({
        display_name: displayName.trim(),
        avatar_url: selectedAvatar,
        onboarding_completed: true,
      })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Welcome to Maktab AI Arena!
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Choose your avatar and arena display name
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Avatar selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Select Arena Avatar
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  style={{
                    fontSize: '1.8rem',
                    padding: '10px',
                    borderRadius: '12px',
                    border: selectedAvatar === av ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                    backgroundColor: selectedAvatar === av ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Display name */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Display Name *
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Javodbek_9A"
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <Button type="submit" variant="primary" loading={isLoading} style={{ width: '100%' }} icon={Check}>
            Save Profile & Get Started
          </Button>
        </form>
      </div>
    </div>
  )
}
