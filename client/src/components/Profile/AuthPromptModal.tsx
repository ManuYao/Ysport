import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { colors, fonts } from '@/theme/theme'

interface AuthPromptModalProps {
  open: boolean
  onClose: () => void
  onGoToOnboarding: () => void
}

export default function AuthPromptModal({ open, onClose, onGoToOnboarding }: AuthPromptModalProps) {
  const { login } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function handleClose() {
    setShowLogin(false)
    setEmail('')
    setPassword('')
    setError(null)
    onClose()
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    background: '#111', border: '0.5px solid #2a2a2a',
    color: '#f0f0f0', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div
      onClick={handleClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#141414', border: '0.5px solid #2a2a2a', borderRadius: 18, padding: '28px 24px', width: '100%', maxWidth: 340, position: 'relative' }}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#3a3a3a', fontSize: 16, lineHeight: 1, padding: 4 }}
        >
          ✕
        </button>

        {!showLogin ? (
          <>
            {/* Logo + titre */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🏃</div>
              <div style={{ fontFamily: fonts.title, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.5, marginBottom: 6 }}>
                Y<span style={{ background: `linear-gradient(135deg, ${colors.gold}, ${colors.gold2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Sport</span>
              </div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                Connecte-toi pour accéder à ton profil,<br />tes stats et la communauté.
              </div>
            </div>

            {/* Boutons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={onGoToOnboarding}
                style={{ width: '100%', padding: '13px 18px', borderRadius: 11, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: `linear-gradient(135deg, ${colors.gold}, ${colors.gold2})`, color: '#080808', letterSpacing: '0.1px' }}
              >
                S'inscrire gratuitement →
              </button>
              <button
                onClick={() => setShowLogin(true)}
                style={{ width: '100%', padding: '13px 18px', borderRadius: 11, fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', background: 'transparent', color: '#aaa', border: '0.5px solid #2a2a2a', letterSpacing: '0.1px' }}
              >
                Se connecter
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Back link */}
            <button
              onClick={() => { setShowLogin(false); setError(null) }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#3a3a3a', fontSize: 11, fontFamily: 'inherit', padding: '0 0 16px', marginTop: -4 }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              Retour
            </button>

            <div style={{ fontFamily: fonts.title, fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 20, letterSpacing: -0.3 }}>
              Se connecter
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                autoComplete="email"
                required
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                autoComplete="current-password"
                required
              />

              {error && (
                <div style={{ fontSize: 11, color: '#e05555', background: '#2a0a0a', border: '0.5px solid #ff444430', borderRadius: 8, padding: '8px 12px' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                style={{ width: '100%', padding: '13px 18px', borderRadius: 11, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: loading ? 'wait' : 'pointer', border: 'none', background: `linear-gradient(135deg, ${colors.gold}, ${colors.gold2})`, color: '#080808', opacity: (loading || !email || !password) ? 0.5 : 1, marginTop: 4 }}
              >
                {loading ? 'Connexion…' : 'Se connecter →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', fontSize: 11, color: '#3a3a3a', marginTop: 16 }}>
              Pas encore de compte ?{' '}
              <span onClick={onGoToOnboarding} style={{ color: colors.gold, cursor: 'pointer', fontWeight: 500 }}>S'inscrire</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
