import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, fonts, sports as ALL_SPORTS } from '@/theme/theme'
import type { SportId } from '@/theme/theme'
import { useAuth } from '@/contexts/AuthContext'
import { fetchSpotsFromGouv } from '@/lib/api'

// ─── Constantes ───────────────────────────────────────────
const TOTAL_STEPS = 3
const SPORTS_KEY  = 'ysport_sports'

// ─── Animations entre screens ─────────────────────────────
const slideVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
}
const slideTrans = { duration: 0.32, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

// ─── Props ────────────────────────────────────────────────
interface Props { onDone: () => void; onGoToLanding: () => void }

export default function OnboardingPage({ onDone, onGoToLanding }: Props) {
  const auth = useAuth()

  // Navigation
  const [step, setStep]       = useState(0)   // 0=splash 1=form 2=loc 3=sports 4=prêt  5=login
  const [dir, setDir]         = useState(1)
  const [loginMode, setLoginMode] = useState(false)

  // Données formulaire
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [selected, setSelected] = useState<SportId[]>([])
  const [geoGranted, setGeoGranted] = useState(false)
  const [geoCoords, setGeoCoords]   = useState<{ lat: number; lng: number } | null>(null)

  // Auth states
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError]     = useState<string | null>(null)

  const didSubmit = useRef(false)

  function go(next: number) {
    setDir(next > step ? 1 : -1)
    setStep(next)
    setAuthError(null)
  }

  function toggleSport(id: SportId) {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function handleGoLogin() {
    setLoginMode(true)
    setAuthError(null)
    go(5)
  }

  function handleGoRegister() {
    setLoginMode(false)
    setAuthError(null)
    go(1)
  }

  // Timeout pour éviter un spinner infini si Supabase rate-limite ou ne répond pas
  function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
    ])
  }

  // ── Inscription réelle ──────────────────────────────────
  async function handleRegister() {
    if (didSubmit.current) return
    didSubmit.current = true
    setAuthLoading(true)
    setAuthError(null)
    try {
      await withTimeout(
        auth.register(email, password, name, selected, geoCoords ?? undefined),
        12_000,
        'Serveur trop long à répondre. Réessaie dans quelques secondes.',
      )
      localStorage.setItem(SPORTS_KEY, JSON.stringify(selected))
      onDone()
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Erreur de connexion au serveur.')
      didSubmit.current = false
    } finally {
      setAuthLoading(false)
    }
  }

  // ── Connexion réelle ────────────────────────────────────
  async function handleLogin(loginEmail: string, loginPassword: string) {
    if (didSubmit.current) return
    didSubmit.current = true
    setAuthLoading(true)
    setAuthError(null)
    try {
      await withTimeout(
        auth.login(loginEmail, loginPassword),
        12_000,
        'Serveur trop long à répondre. Réessaie dans quelques secondes.',
      )
      onDone()
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Email ou mot de passe incorrect.')
      didSubmit.current = false
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#080808', overflow: 'hidden', display: 'flex', justifyContent: 'center', zIndex: 9999 }}>
      {/* Bruit de fond */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")", pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 390, height: '100%', background: '#080808', border: '0.5px solid #1a1a1a', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence custom={dir} mode="wait">
          {step === 0 && (
            <ScreenSplash
              key="s0"
              onRegister={() => go(1)}
              onLogin={handleGoLogin}
              onGoToLanding={onGoToLanding}
            />
          )}
          {step === 1 && !loginMode && (
            <ScreenInscription
              key="s1" dir={dir} step={1} totalSteps={TOTAL_STEPS}
              name={name} email={email} password={password}
              setName={setName} setEmail={setEmail} setPassword={setPassword}
              onBack={() => go(0)} onNext={() => go(2)}
            />
          )}
          {step === 2 && (
            <ScreenLocalisation
              key="s2" dir={dir} step={2} totalSteps={TOTAL_STEPS}
              granted={geoGranted}
              onGrant={() => {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                    setGeoGranted(true)
                    go(3)
                  },
                  () => { setGeoGranted(true); go(3) },
                  { enableHighAccuracy: true, timeout: 8000 }
                )
              }}
              onBack={() => go(1)} onSkip={() => go(3)}
            />
          )}
          {step === 3 && (
            <ScreenSports
              key="s3" dir={dir} step={3} totalSteps={TOTAL_STEPS}
              selected={selected} onToggle={toggleSport}
              onBack={() => go(2)} onNext={() => go(4)}
            />
          )}
          {step === 4 && (
            <ScreenReady
              key="s4" dir={dir} name={name}
              geoCoords={geoCoords}
              loading={authLoading} error={authError}
              onDone={handleRegister}
              onBack={() => go(3)}
            />
          )}
          {step === 5 && (
            <ScreenLogin
              key="s5" dir={dir}
              loading={authLoading} error={authError}
              onBack={() => { setLoginMode(false); go(0) }}
              onLogin={handleLogin}
              onGoRegister={handleGoRegister}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  S0 — SPLASH
// ══════════════════════════════════════════════════════════
function ScreenSplash({ onRegister, onLogin, onGoToLanding }: { onRegister: () => void; onLogin: () => void; onGoToLanding: () => void }) {
  const [socialFeedback, setSocialFeedback] = useState<string | null>(null)

  function handleSocialClick(provider: string) {
    setSocialFeedback(`${provider} — bientôt disponible`)
    setTimeout(() => setSocialFeedback(null), 2200)
  }

  return (
    <motion.div
      key="splash"
      custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTrans}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#080808', overflow: 'hidden' }}
    >
      {/* Halo or */}
      <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, #C9A84C22 0%, #C9A84C08 45%, transparent 70%)', pointerEvents: 'none', animation: 'ysport-halo-pulse 4s ease-in-out infinite' }} />
      {/* Halo bleu */}
      <div style={{ position: 'absolute', top: 20, left: '20%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, #6b7fff0e 0%, transparent 70%)', pointerEvents: 'none' }} />
      {/* Grille */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#ffffff04 1px,transparent 1px),linear-gradient(90deg,#ffffff04 1px,transparent 1px)', backgroundSize: '40px 40px', maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%,black 0%,transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 28px 20px', position: 'relative', zIndex: 2 }}>
        {/* Emblème */}
        <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 20px' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 26, border: `1px solid ${colors.goldBorder}`, background: 'conic-gradient(transparent 0deg,#C9A84C22 90deg,transparent 180deg,#C9A84C11 270deg,transparent 360deg)', animation: 'ysport-rotate 8s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 6, borderRadius: 20, background: 'linear-gradient(135deg,#1a1407 0%,#0e0c05 100%)', border: `0.5px solid #C9A84C22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, boxShadow: 'inset 0 1px 0 #C9A84C18, 0 8px 32px #C9A84C10' }}>
            🏃
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: fonts.title, fontSize: 42, fontWeight: 800, letterSpacing: -2, lineHeight: 1, color: '#fff', marginBottom: 8 }}>
            Y<GoldText>Sport</GoldText>
          </div>
          <div style={{ fontSize: 13, fontWeight: 300, fontStyle: 'italic', color: colors.text2, letterSpacing: '0.3px' }}>
            Trouve un spot. Joue maintenant.
          </div>
        </div>

        <div style={{ display: 'flex', background: '#161616', border: `0.5px solid #252525`, borderRadius: 14, overflow: 'hidden', marginBottom: 36, width: '100%' }}>
          {[['2 400+','Spots'],['Live','Dispo réel'],['100%','Gratuit']].map(([n, l], i) => (
            <div key={l} style={{ flex: 1, padding: '12px 10px', textAlign: 'center', borderRight: i < 2 ? '0.5px solid #1e1e1e' : 'none' }}>
              <div style={{ fontFamily: fonts.title, fontSize: 18, fontWeight: 700, background: `linear-gradient(135deg,${colors.gold},${colors.gold2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{n}</div>
              <div style={{ fontSize: 9, color: '#3a3a3a', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Auth buttons */}
      <div style={{ padding: '20px 24px 40px', background: 'linear-gradient(0deg,#080808 60%,transparent)', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 9 }}>

        {/* Retour à l'accueil */}
        <button
          onClick={onGoToLanding}
          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#3a3a3a', fontSize: 11, fontFamily: 'inherit', padding: '2px 0', marginBottom: 2 }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Retour à l'accueil
        </button>

        {/* Feedback social (bientôt dispo) */}
        <AnimatePresence>
          {socialFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ textAlign: 'center', fontSize: 11, color: colors.gold, background: colors.goldDim, border: `0.5px solid ${colors.goldBorder}`, borderRadius: 8, padding: '6px 12px' }}
            >
              ⏳ {socialFeedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Google */}
        <button
          onClick={() => handleSocialClick('Google')}
          style={{ width: '100%', padding: '14px 18px', borderRadius: 13, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'not-allowed', border: 'none', background: '#fff', color: '#555', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 20px #ffffff10', opacity: 0.55 }}
          title="Bientôt disponible"
        >
          <svg style={{ width: 22, height: 22, flexShrink: 0 }} viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          <span style={{ flex: 1, textAlign: 'left' }}>Continuer avec Google</span>
          <span style={{ fontSize: 9, color: '#888', background: '#f0f0f015', borderRadius: 5, padding: '2px 6px' }}>Bientôt</span>
        </button>

        {/* Apple */}
        <button
          onClick={() => handleSocialClick('Apple')}
          style={{ width: '100%', padding: '14px 18px', borderRadius: 13, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'not-allowed', border: '0.5px solid #2a2a2a', background: '#111', color: '#555', display: 'flex', alignItems: 'center', gap: 10, opacity: 0.55 }}
          title="Bientôt disponible"
        >
          <svg style={{ width: 22, height: 22, flexShrink: 0 }} viewBox="0 0 24 24" fill="#555"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          <span style={{ flex: 1, textAlign: 'left' }}>Continuer avec Apple</span>
          <span style={{ fontSize: 9, color: '#666', background: '#ffffff08', borderRadius: 5, padding: '2px 6px' }}>Bientôt</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: '#3a3a3a' }}>
          <div style={{ flex: 1, height: '0.5px', background: '#1e1e1e' }} />
          ou inscription par email
          <div style={{ flex: 1, height: '0.5px', background: '#1e1e1e' }} />
        </div>

        <button onClick={onRegister} style={{ width: '100%', padding: 12, borderRadius: 11, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', background: 'transparent', color: colors.text2, border: `0.5px solid #252525`, letterSpacing: '0.2px' }}>
          Créer un compte avec email →
        </button>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#3a3a3a' }}>
          Déjà inscrit ? <span onClick={onLogin} style={{ color: colors.gold, cursor: 'pointer', fontWeight: 500 }}>Se connecter</span>
        </div>
      </div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════
//  S1 — INSCRIPTION
// ══════════════════════════════════════════════════════════
interface FormScreenProps {
  dir: number; step: number; totalSteps: number
  onBack: () => void
}

function ScreenInscription({ dir, step, totalSteps, name, email, password, setName, setEmail, setPassword, onBack, onNext }: FormScreenProps & { name: string; email: string; password: string; setName: (v: string) => void; setEmail: (v: string) => void; setPassword: (v: string) => void; onNext: () => void }) {
  const canContinue = name.trim().length > 0 && email.includes('@') && password.length >= 6
  return (
    <FormScreen dir={dir} step={step} totalSteps={totalSteps} onBack={onBack}>
      <div style={{ flex: 1, padding: '0 22px', position: 'relative', zIndex: 1 }}>
        <FScreenTitle>Crée ton <GoldText>compte</GoldText></FScreenTitle>
        <div style={{ fontSize: 13, color: colors.text2, marginBottom: 24, lineHeight: 1.5 }}>Gratuit. Toujours.</div>
        <Field label="Prénom"><input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Manu" style={inputStyle} /></Field>
        <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" style={inputStyle} /></Field>
        <Field label="Mot de passe"><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 caractères minimum" style={inputStyle} /></Field>
      </div>
      <div style={{ padding: '16px 22px 36px', position: 'relative', zIndex: 1 }}>
        <BtnCTA onClick={onNext} disabled={!canContinue}>Continuer</BtnCTA>
        <div style={{ textAlign: 'center', fontSize: 10, color: '#3a3a3a', marginTop: 10 }}>En continuant tu acceptes nos CGU</div>
      </div>
    </FormScreen>
  )
}

// ══════════════════════════════════════════════════════════
//  S2 — LOCALISATION
// ══════════════════════════════════════════════════════════
function ScreenLocalisation({ dir, step, totalSteps, onGrant, onBack, onSkip }: FormScreenProps & { granted: boolean; onGrant: () => void; onSkip: () => void }) {
  return (
    <FormScreen dir={dir} step={step} totalSteps={totalSteps} onBack={onBack}>
      <div style={{ padding: '0 22px', position: 'relative', zIndex: 1 }}>
        <FScreenTitle>Où tu <GoldText>sportes ?</GoldText></FScreenTitle>
        <div style={{ fontSize: 13, color: colors.text2, marginBottom: 16, lineHeight: 1.5 }}>On trouve les spots les plus proches en temps réel.</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 22px 16px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: 320, borderRadius: 18, border: `0.5px solid #252525`, overflow: 'hidden', position: 'relative', background: '#111113', boxShadow: '0 8px 40px #00000050' }}>
          <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', width: '100%', height: 200 }}>
            <rect width="320" height="200" fill="#111113"/>
            <rect x="8"   y="6"   width="68" height="48" rx="3" fill="#191919"/>
            <rect x="90"  y="4"   width="52" height="36" rx="3" fill="#191919"/>
            <rect x="158" y="8"   width="76" height="46" rx="3" fill="#191919"/>
            <rect x="252" y="4"   width="62" height="50" rx="3" fill="#191919"/>
            <rect x="6"   y="82"  width="54" height="58" rx="3" fill="#191919"/>
            <rect x="76"  y="74"  width="70" height="68" rx="3" fill="#191919"/>
            <rect x="162" y="80"  width="60" height="60" rx="3" fill="#191919"/>
            <rect x="240" y="76"  width="74" height="64" rx="3" fill="#191919"/>
            <rect x="8"   y="162" width="85" height="38" rx="3" fill="#191919"/>
            <rect x="108" y="158" width="62" height="42" rx="3" fill="#191919"/>
            <rect x="188" y="162" width="78" height="38" rx="3" fill="#191919"/>
            <line x1="0"   y1="70"  x2="320" y2="70"  stroke="#222" strokeWidth="9"/>
            <line x1="0"   y1="154" x2="320" y2="154" stroke="#222" strokeWidth="7"/>
            <line x1="68"  y1="0"   x2="68"  y2="200" stroke="#222" strokeWidth="9"/>
            <line x1="152" y1="0"   x2="152" y2="200" stroke="#222" strokeWidth="7"/>
            <line x1="236" y1="0"   x2="236" y2="200" stroke="#222" strokeWidth="7"/>
            <ellipse cx="160" cy="118" rx="30" ry="17" fill="#182018"/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 55%,#C9A84C12 0%,transparent 55%)', pointerEvents: 'none', zIndex: 3 }} />
          {[
            { left: '63%', top: '42%', label: 'Léon Blum ⚽', gold: true  },
            { left: '28%', top: '30%', label: '🏀 Jean Moulin', gold: false },
            { left: '78%', top: '65%', label: '🎾 Tennis',      gold: false },
          ].map(p => (
            <div key={p.label} style={{ position: 'absolute', left: p.left, top: p.top, zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translate(-50%,-100%)', animation: 'ysport-data-float 3s ease-in-out infinite' }}>
              <div style={{ background: p.gold ? colors.gold : '#141414', border: `0.5px solid ${p.gold ? colors.gold : '#252525'}`, borderRadius: 5, padding: '2px 7px', fontSize: 8, fontWeight: 500, color: p.gold ? '#111' : '#999', whiteSpace: 'nowrap', marginBottom: 2, boxShadow: '0 2px 8px #00000040' }}>{p.label}</div>
              <div style={{ width: 1, height: 7, background: p.gold ? colors.gold : '#252525' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.gold ? colors.gold : '#252525', border: '1px solid #111' }} />
            </div>
          ))}
          <div style={{ position: 'absolute', left: '50%', top: '56%', transform: 'translate(-50%,-50%)', zIndex: 5 }}>
            {[0, 0.7, 1.4].map(delay => (
              <div key={delay} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', borderRadius: '50%', border: `1.5px solid ${colors.gold}`, animation: `ysport-pulsate 2.2s ease-out ${delay}s infinite` }} />
            ))}
            <div style={{ width: 13, height: 13, borderRadius: '50%', background: colors.gold, border: '2.5px solid #111113', position: 'relative', zIndex: 2, boxShadow: `0 0 0 3px #C9A84C28, 0 2px 8px #C9A84C40` }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#161616', border: `0.5px solid #252525`, borderRadius: 12, padding: '11px 14px', marginTop: 14, width: '100%', maxWidth: 320 }}>
          <span style={{ fontSize: 20 }}>📍</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: colors.text }}><span style={{ fontFamily: fonts.title, fontSize: 22, fontWeight: 700, color: colors.gold }}>14 </span>spots trouvés</div>
            <div style={{ fontSize: 10, color: '#3a3a3a' }}>Paris 11e · estimé · rayon 10 km</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 22px 36px', position: 'relative', zIndex: 1 }}>
        <BtnCTA onClick={onGrant}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          Autoriser ma localisation
        </BtnCTA>
        <div onClick={onSkip} style={{ display: 'block', textAlign: 'center', fontSize: 11, color: '#3a3a3a', marginTop: 12, cursor: 'pointer' }}>Passer cette étape →</div>
      </div>
    </FormScreen>
  )
}

// ══════════════════════════════════════════════════════════
//  S3 — SPORTS
// ══════════════════════════════════════════════════════════
function ScreenSports({ dir, step, totalSteps, selected, onToggle, onBack, onNext }: FormScreenProps & { selected: SportId[]; onToggle: (id: SportId) => void; onNext: () => void }) {
  return (
    <FormScreen dir={dir} step={step} totalSteps={totalSteps} onBack={onBack}>
      <div style={{ padding: '0 22px 12px', position: 'relative', zIndex: 1 }}>
        <FScreenTitle>Tes <GoldText>sports ?</GoldText></FScreenTitle>
        <div style={{ fontSize: 13, color: colors.text2, marginBottom: 12, lineHeight: 1.5 }}>Choisis tout ce que tu pratiques.</div>
      </div>
      <div style={{ fontSize: 11, color: '#3a3a3a', padding: '0 22px', marginBottom: 4, position: 'relative', zIndex: 1 }}>
        {selected.length === 0
          ? 'Sélectionne au moins 1 sport'
          : <><span style={{ color: colors.gold, fontWeight: 600 }}>{selected.length} sport{selected.length > 1 ? 's' : ''}</span> sélectionné{selected.length > 1 ? 's' : ''}</>
        }
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, padding: '4px 22px 16px', flex: 1, overflowY: 'auto', scrollbarWidth: 'none', position: 'relative', zIndex: 1 }}>
        {ALL_SPORTS.map(sport => {
          const isSel = selected.includes(sport.id)
          return (
            <div key={sport.id} onClick={() => onToggle(sport.id)}
              style={{ background: isSel ? '#120f03' : '#161616', border: `0.5px solid ${isSel ? colors.gold : '#252525'}`, borderRadius: 14, padding: '16px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden', boxShadow: isSel ? `0 0 0 1px #C9A84C18, inset 0 1px 0 #C9A84C10` : 'none', transition: 'all 0.18s' }}
            >
              <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: '50%', background: isSel ? colors.gold : '#1c1c1c', border: `0.5px solid ${isSel ? colors.gold : '#252525'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: isSel ? '#111' : 'transparent', fontWeight: 700, transition: 'all 0.15s' }}>✓</div>
              <div style={{ fontSize: 26 }}>{sport.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: isSel ? '#fff' : '#ccc', transition: 'color 0.15s' }}>{sport.name}</div>
              <div style={{ fontSize: 9, color: '#3a3a3a' }}>{sport.sub}</div>
            </div>
          )
        })}
      </div>
      <div style={{ padding: '16px 22px 36px', position: 'relative', zIndex: 1 }}>
        <BtnCTA onClick={onNext} disabled={selected.length === 0}>C'est parti 🔥</BtnCTA>
      </div>
    </FormScreen>
  )
}

// ══════════════════════════════════════════════════════════
//  S4 — PRÊT (+ appel register)
// ══════════════════════════════════════════════════════════
function ScreenReady({ dir, name, geoCoords, loading, error, onDone, onBack }: { dir: number; name: string; geoCoords?: { lat: number; lng: number } | null; loading: boolean; error: string | null; onDone: () => void; onBack: () => void }) {
  const [nearbyCount, setNearbyCount] = useState<number | null>(null)

  useEffect(() => {
    if (!geoCoords) return
    const ctrl = new AbortController()
    fetchSpotsFromGouv(geoCoords.lat, geoCoords.lng, 5, null, ctrl.signal)
      .then(spots => { if (!ctrl.signal.aborted) setNearbyCount(spots.length) })
      .catch(() => {})
    return () => ctrl.abort()
  }, [geoCoords])

  const spotLabel = nearbyCount !== null
    ? `${nearbyCount} spot${nearbyCount > 1 ? 's' : ''}`
    : '…'

  return (
    <motion.div
      key="ready"
      custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTrans}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#080808', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', top: -60, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle,#C9A84C18 0%,#C9A84C05 40%,transparent 70%)', animation: 'ysport-halo-pulse 3s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', bottom: 60, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle,#6b7fff0a 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#ffffff03 1px,transparent 1px),linear-gradient(90deg,#ffffff03 1px,transparent 1px)', backgroundSize: '36px 36px', maskImage: 'radial-gradient(ellipse 80% 70% at 50% 20%,black 0%,transparent 65%)', pointerEvents: 'none' }} />

      {/* Bouton retour */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 22px 0', position: 'relative', zIndex: 1 }}>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: 9, background: '#161616', border: '0.5px solid #252525', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#777', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '20px 28px 36px', textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 28px' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 28, background: 'conic-gradient(transparent 0deg,#C9A84C30 90deg,transparent 180deg,#C9A84C18 270deg,transparent 360deg)', animation: 'ysport-rotate 6s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 5, borderRadius: 22, background: 'linear-gradient(135deg,#1c1607,#0e0c04)', border: `0.5px solid ${colors.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, boxShadow: '0 0 40px #C9A84C20, inset 0 1px 0 #C9A84C15' }}>
            🏆
          </div>
        </div>

        <div style={{ fontFamily: fonts.title, fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: -1, lineHeight: 1.05, marginBottom: 10 }}>
          Prêt à<br /><GoldText>jouer ?</GoldText>
        </div>
        <div style={{ fontSize: 14, color: colors.text2, lineHeight: 1.6, marginBottom: 24, fontWeight: 300 }}>
          {name ? `Bienvenue ${name} !` : 'Ton profil est créé.'}<br />{spotLabel} t'attendent.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 28, width: '100%' }}>
          {[
            { ico: '📍', title: spotLabel,       sub: 'Autour de toi'      },
            { ico: '💬', title: 'Canal local', sub: '28 sportifs'        },
            { ico: '🎯', title: 'Events live', sub: 'Rejoint en 1 tap'   },
            { ico: '🏆', title: 'Points',      sub: 'Dès ta 1ère session' },
          ].map(f => (
            <div key={f.title} style={{ background: '#161616', border: `0.5px solid #252525`, borderRadius: 11, padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{f.ico}</span>
              <div style={{ fontSize: 10, color: colors.text2, lineHeight: 1.4 }}>
                <div style={{ fontSize: 11, color: colors.text, fontWeight: 500, marginBottom: 1 }}>{f.title}</div>
                {f.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Message d'erreur */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ width: '100%', marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: colors.redDim, border: `0.5px solid ${colors.redBorder}`, fontSize: 12, color: colors.red, lineHeight: 1.4, textAlign: 'left' }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={loading ? undefined : onDone}
          disabled={loading}
          style={{ width: '100%', padding: 16, borderRadius: 14, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: loading ? 'wait' : 'pointer', border: 'none', background: `linear-gradient(135deg,${colors.gold},${colors.gold2})`, color: '#0a0800', letterSpacing: '0.3px', boxShadow: '0 6px 30px #C9A84C30', marginBottom: 10, transition: 'all 0.18s', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading ? (
            <>
              <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #0a080040', borderTop: '2px solid #0a0800', display: 'inline-block', animation: 'ysport-rotate 0.8s linear infinite' }} />
              Création du compte…
            </>
          ) : (
            'Explorer les spots 🗺️'
          )}
        </button>
        <div onClick={loading ? undefined : onDone} style={{ fontSize: 11, color: '#3a3a3a', cursor: loading ? 'default' : 'pointer', padding: 6 }}>
          Voir mon profil d'abord
        </div>
      </div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════
//  S5 — LOGIN
// ══════════════════════════════════════════════════════════
function ScreenLogin({ dir, loading, error, onBack, onLogin, onGoRegister }: { dir: number; loading: boolean; error: string | null; onBack: () => void; onLogin: (email: string, password: string) => void; onGoRegister: () => void }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const canLogin = email.includes('@') && password.length >= 6
  return (
    <motion.div
      key="login"
      custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTrans}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#080808', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', width: 250, height: 200, top: -60, right: -60, borderRadius: '50%', background: 'radial-gradient(circle,#C9A84C12 0%,transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '22px 22px 0', position: 'relative', zIndex: 1 }}>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: 9, background: '#161616', border: '0.5px solid #252525', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.text2, flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.text2 }}>Connexion</span>
      </div>

      <div style={{ flex: 1, padding: '28px 22px 0', position: 'relative', zIndex: 1 }}>
        <FScreenTitle>Content de<br/>te <GoldText>revoir !</GoldText></FScreenTitle>
        <div style={{ fontSize: 13, color: colors.text2, marginBottom: 28, lineHeight: 1.5 }}>Entre tes identifiants pour accéder à tes spots.</div>

        <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" style={inputStyle} autoComplete="email" /></Field>
        <Field label="Mot de passe"><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Ton mot de passe" style={inputStyle} autoComplete="current-password" /></Field>

        {/* Erreur */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ marginTop: 8, padding: '10px 14px', borderRadius: 10, background: colors.redDim, border: `0.5px solid ${colors.redBorder}`, fontSize: 12, color: colors.red }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ padding: '20px 22px 36px', position: 'relative', zIndex: 1 }}>
        <BtnCTA onClick={() => canLogin && onLogin(email, password)} disabled={!canLogin || loading}>
          {loading ? (
            <>
              <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #0a080040', borderTop: '2px solid #0a0800', display: 'inline-block', animation: 'ysport-rotate 0.8s linear infinite' }} />
              Connexion…
            </>
          ) : 'Se connecter'}
        </BtnCTA>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#3a3a3a', marginTop: 14 }}>
          Pas encore de compte ? <span onClick={onGoRegister} style={{ color: colors.gold, cursor: 'pointer', fontWeight: 500 }}>S'inscrire</span>
        </div>
      </div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════
//  SHARED — FormScreen wrapper
// ══════════════════════════════════════════════════════════
function FormScreen({ dir, step, totalSteps, onBack, children }: { dir: number; step: number; totalSteps: number; onBack: () => void; children: React.ReactNode }) {
  const pct = Math.round(((step - 1) / totalSteps) * 100)
  return (
    <motion.div
      custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={slideTrans}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#080808', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', width: 250, height: 200, top: -60, right: -60, borderRadius: '50%', background: 'radial-gradient(circle,#C9A84C12 0%,transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', width: 200, height: 200, bottom: 80, left: -80, borderRadius: '50%', background: 'radial-gradient(circle,#6b7fff0a 0%,transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '22px 22px 0', position: 'relative', zIndex: 1 }}>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: 9, background: '#161616', border: '0.5px solid #252525', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.text2, flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, height: 2, background: '#252525', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${colors.gold},${colors.gold2})`, borderRadius: 2, transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)' }} />
        </div>
        <div style={{ fontSize: 10, color: '#3a3a3a', flexShrink: 0 }}>{step - 1} / {totalSteps}</div>
      </div>

      <div style={{ height: 22 }} />
      {children}
    </motion.div>
  )
}

// ─── Helpers UI ───────────────────────────────────────────
function GoldText({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: `linear-gradient(135deg,${colors.gold},${colors.gold2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
      {children}
    </span>
  )
}

function FScreenTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: fonts.title, fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 6, letterSpacing: -0.5 }}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 10, color: '#3a3a3a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</label>
      {children}
    </div>
  )
}

function BtnCTA({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{ width: '100%', padding: 15, borderRadius: 13, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', background: `linear-gradient(135deg,${colors.gold},${colors.gold2})`, color: '#0e0c05', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.35 : 1, boxShadow: disabled ? 'none' : '0 4px 20px #C9A84C25', letterSpacing: '0.2px', transition: 'all 0.18s' }}
    >
      {children}
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#161616',
  border: '0.5px solid #252525', borderRadius: 12,
  padding: '13px 15px', color: colors.text,
  fontSize: 13, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
}