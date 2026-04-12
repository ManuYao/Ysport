import { useState, useEffect } from 'react'
import { colors, fonts } from '@/theme/theme'
import { fetchGlobalStats, fetchSpotsFromGouv } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface LandingPageProps {
  onStart: () => void       // accès direct à la map (tous utilisateurs)
  onSignup?: () => void     // inscription explicite (non-connectés)
  onGoToApp?: () => void
}

// ─── Shared micro-components ─────────────────────────────────────────────────

function GoldDot({ size = 6, pulse = false }: { size?: number; pulse?: boolean }) {
  return (
    <div style={{
      width: size, height: size, background: colors.gold, borderRadius: '50%',
      flexShrink: 0,
      animation: pulse ? 'ysport-pulse 1.5s infinite' : undefined,
    }} />
  )
}

function CheckIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PlanCheck({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#888' }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        background: `${colors.gold}18`, border: `0.5px solid ${colors.gold}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <CheckIcon />
      </div>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LandingPage({ onStart, onSignup, onGoToApp }: LandingPageProps) {
  const { user, login } = useAuth()
  const [hoveredFeat, setHoveredFeat] = useState<number | null>(null)
  const [dbStats, setDbStats] = useState<{ totalSpots: number; totalCities: number } | null>(null)
  const [nearbySports, setNearbySports] = useState<number | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)
    try {
      await login(loginEmail, loginPassword)
      setShowLogin(false)
      // App.tsx détecte user non-null et bascule vers 'app' automatiquement
    } catch (err: unknown) {
      setLoginError((err as Error).message ?? 'Connexion impossible')
    } finally {
      setLoginLoading(false)
    }
  }

  useEffect(() => {
    // Stats globales DB
    fetchGlobalStats().then(setDbStats).catch(() => {})

    // Compteur sports à proximité (avant connexion)
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      fetchSpotsFromGouv(coords.latitude, coords.longitude, 5)
        .then(spots => {
          const uniqueSports = new Set(spots.flatMap(s => s.sports)).size
          setNearbySports(uniqueSports)
        })
        .catch(() => {})
    })
  }, [])

  return (
    <div style={{
      background: colors.bg2, color: colors.text,
      overflowY: 'auto', overflowX: 'hidden', height: '100%',
      fontFamily: fonts.body,
    }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#0e0e0eee',
        borderBottom: `0.5px solid #1e1e1e`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: '#fff' }}>
          <GoldDot size={7} />
          <span style={{ fontFamily: fonts.title, fontWeight: 800 }}>
            Y<span style={{ color: colors.gold }}>Sport</span>
          </span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: 24, marginLeft: 32 }}>
          {['Découvrir', 'Événements', 'Communauté', 'Premium'].map(l => (
            <NavLink key={l}>{l}</NavLink>
          ))}
        </div>

        {/* Right */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {user ? (
            <>
              {/* Avatar initiale */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#1a1709', border: `1.5px solid ${colors.gold}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 13, color: colors.gold,
                fontFamily: fonts.title, flexShrink: 0,
              }}>
                {user.initial}
              </div>
              {/* Nom */}
              <span style={{ fontSize: 12, color: '#aaa', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </span>
              {/* CTA vers l'app */}
              <button onClick={() => onGoToApp?.()} style={{
                fontSize: 13, padding: '7px 18px', borderRadius: 8,
                border: 'none', background: colors.gold,
                color: '#111', fontWeight: 600, cursor: 'pointer', fontFamily: fonts.body,
              }}>
                Explorer mes spots →
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setShowLogin(true)} style={{
                fontSize: 13, padding: '7px 16px', borderRadius: 8,
                border: `0.5px solid #2a2a2a`, background: 'transparent',
                color: '#888', cursor: 'pointer', fontFamily: fonts.body, transition: 'all 0.15s',
              }}>
                Connexion
              </button>
              <button onClick={user ? () => onGoToApp?.() : (onSignup ?? onStart)} style={{
                fontSize: 13, padding: '7px 18px', borderRadius: 8,
                border: 'none', background: colors.gold,
                color: '#111', fontWeight: 600, cursor: 'pointer', fontFamily: fonts.body,
              }}>
                {user ? 'Accéder à la Map' : 'Commencer gratuitement'}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: 600, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        padding: '60px 32px 40px',
      }}>
        {/* BG gradient */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${colors.gold}08 0%, transparent 70%)`,
        }} />

        {/* Label pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: `${colors.gold}12`, border: `0.5px solid ${colors.gold}33`,
          borderRadius: 20, padding: '5px 14px',
          fontSize: 11, color: colors.gold, fontWeight: 500,
          marginBottom: 24, letterSpacing: '0.5px',
        }}>
          <GoldDot size={5} pulse />
          {nearbySports !== null
            ? `${nearbySports} sport${nearbySports > 1 ? 's' : ''} disponibles près de vous`
            : 'Spots sportifs géolocalisés en temps réel'}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 52, fontWeight: 700, textAlign: 'center', lineHeight: 1.1,
          color: '#fff', maxWidth: 640, marginBottom: 16, letterSpacing: '-1.5px',
          fontFamily: fonts.title,
        }}>
          Trouve ton spot.<br /><span style={{ color: colors.gold }}>Joue maintenant.</span>
        </h1>

        {/* Sub */}
        <p style={{
          fontSize: 16, color: '#555', textAlign: 'center',
          maxWidth: 440, lineHeight: 1.6, marginBottom: 32,
        }}>
          Terrains, salles, pistes — géolocalisés en temps réel. Rejoins les sportifs de ton quartier en quelques secondes.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <button onClick={user ? () => onGoToApp?.() : onStart} style={{
            fontSize: 14, padding: '12px 28px', borderRadius: 10,
            border: 'none', background: colors.gold,
            color: '#111', fontWeight: 700, cursor: 'pointer', fontFamily: fonts.body,
          }}>
            Trouver un spot →
          </button>
          <button style={{
            fontSize: 14, padding: '12px 22px', borderRadius: 10,
            border: `0.5px solid #2a2a2a`, background: 'transparent',
            color: '#666', cursor: 'pointer', fontFamily: fonts.body,
          }}>
            Voir comment ça marche
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#383838' }}>
          <b style={{ color: colors.green }}>100% gratuit</b> pour commencer · Aucune CB requise
        </p>

        {/* MAP PREVIEW */}
        <MapPreview />
      </section>

      {/* ── STATS STRIP ── */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        borderTop: `0.5px solid #1a1a1a`, borderBottom: `0.5px solid #1a1a1a`,
        background: '#121212',
      }}>
        {[
          { num: dbStats ? '+' + dbStats.totalSpots.toLocaleString('fr-FR') : '32,000', label: 'Spots référencés' },
          { num: dbStats ? dbStats.totalCities + ' villes' : '500+', label: 'Couvertes en France' },
          { num: '100%', label: 'Gratuit par défaut' },
          { num: 'Live', label: 'Disponibilité en temps réel' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, maxWidth: 200, padding: '28px 20px', textAlign: 'center',
            borderRight: i < 3 ? `0.5px solid #1a1a1a` : 'none',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: colors.gold, letterSpacing: '-1px', fontFamily: fonts.title }}>{s.num}</div>
            <div style={{ fontSize: 11, color: '#484848', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ── */}
      <section style={{ padding: '80px 32px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: 10, color: colors.gold, textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 600, marginBottom: 10 }}>
          Pourquoi YSport
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-0.8px', marginBottom: 48, lineHeight: 1.2, fontFamily: fonts.title }}>
          Tout ce qu'il faut<br />pour <span style={{ color: colors.gold }}>jouer maintenant</span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredFeat(i)}
              onMouseLeave={() => setHoveredFeat(null)}
              style={{
                background: '#141414',
                border: `0.5px solid ${hoveredFeat === i ? `${colors.gold}33` : '#1e1e1e'}`,
                borderRadius: 14, padding: '22px 20px',
                transition: 'border-color 0.2s', cursor: 'default',
                position: 'relative', overflow: 'hidden',
                opacity: f.badge ? 0.65 : 1,
              }}
            >
              {f.badge && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  background: f.badge === 'soon' ? '#2a0808' : '#1e1100',
                  border: `0.5px solid ${f.badge === 'soon' ? '#ff444440' : '#ff880040'}`,
                  color: f.badge === 'soon' ? '#e05555' : '#e08833',
                  fontSize: 9, fontWeight: 600, borderRadius: 20,
                  padding: '3px 8px', letterSpacing: '0.2px',
                  whiteSpace: 'nowrap', fontFamily: 'inherit',
                }}>
                  {f.badge === 'soon' ? 'Bientôt disponible' : 'Arrive prochainement'}
                </div>
              )}
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, marginBottom: 14,
                background: f.bg,
              }}>
                {f.icon}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0', marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: '#484848', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMMUNITY ── */}
      <section style={{
        background: '#121212',
        borderTop: `0.5px solid #1a1a1a`, borderBottom: `0.5px solid #1a1a1a`,
        padding: '72px 32px',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', gap: 56, alignItems: 'center' }}>
          {/* Text */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: colors.gold, textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 600, marginBottom: 10 }}>
              Communauté locale
            </div>
            <h2 style={{
              fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.8px',
              lineHeight: 1.2, marginBottom: 14, fontFamily: fonts.title,
            }}>
              Parle avec les sportifs<br /><span style={{ color: colors.gold }}>de ton quartier</span>
            </h2>
            <p style={{ fontSize: 13, color: '#484848', lineHeight: 1.7, marginBottom: 20 }}>
              Tu cherches un partenaire pour ce soir ? Tape ton code postal, rejoins le canal local et organise une session en quelques messages. Le canal expire après 24h — gardant tout frais et local.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Canal géo-filtré automatiquement (10 km)',
                'Mentions de spots cliquables dans le chat',
                'Crée un événement directement depuis le chat',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, color: '#888' }}>
                  <div style={{
                    width: 20, height: 20, background: `${colors.gold}15`,
                    border: `0.5px solid ${colors.gold}33`, borderRadius: 5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0,
                  }}>✓</div>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Chat preview */}
          <MiniChat />
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: '80px 32px', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: colors.gold, textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 600, marginBottom: 10 }}>
          Tarifs
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.8px', marginBottom: 6, fontFamily: fonts.title }}>
          Simple et transparent
        </h2>
        <p style={{ fontSize: 13, color: '#484848', marginBottom: 0 }}>
          Commence gratuitement. Passe en premium quand tu veux.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 40, textAlign: 'left' }}>
          {/* Free */}
          <div style={{ background: '#141414', border: `0.5px solid #1e1e1e`, borderRadius: 14, padding: '24px 22px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: fonts.title }}>Gratuit</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: colors.gold, letterSpacing: '-1px', fontFamily: fonts.title }}>
              0€ <span style={{ fontSize: 13, fontWeight: 400, color: '#484848' }}>/ toujours</span>
            </div>
            <p style={{ fontSize: 11, color: '#484848', margin: '8px 0 16px', lineHeight: 1.5 }}>
              L'essentiel pour trouver un spot et jouer avec ta communauté locale.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <PlanCheck>Accès à tous les spots</PlanCheck>
              <PlanCheck>Canal communautaire local</PlanCheck>
              <PlanCheck>Créer 1 événement / semaine</PlanCheck>
              <PlanCheck>Publicités discrètes</PlanCheck>
            </div>
            <button onClick={user ? () => onGoToApp?.() : (onSignup ?? onStart)} style={{
              width: '100%', padding: '10px', borderRadius: 9, fontSize: 13,
              fontWeight: 600, fontFamily: fonts.body, cursor: 'pointer',
              background: 'transparent', border: `0.5px solid #2a2a2a`, color: '#666',
            }}>
              {user ? 'Accéder à la Map' : 'Commencer gratuitement'}
            </button>
          </div>

          {/* Premium */}
          <div style={{ background: '#161410', border: `0.5px solid ${colors.gold}55`, borderRadius: 14, padding: '24px 22px' }}>
            <div style={{
              fontSize: 10, color: colors.gold, background: `${colors.gold}15`,
              border: `0.5px solid ${colors.gold}33`, borderRadius: 20,
              padding: '3px 10px', display: 'inline-block', marginBottom: 12,
            }}>⚡ Premium</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: fonts.title }}>Pro</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: colors.gold, letterSpacing: '-1px', fontFamily: fonts.title }}>
              4,99€ <span style={{ fontSize: 13, fontWeight: 400, color: '#484848' }}>/ mois</span>
            </div>
            <p style={{ fontSize: 11, color: '#484848', margin: '8px 0 16px', lineHeight: 1.5 }}>
              Pour les sportifs réguliers qui veulent aller plus loin.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <PlanCheck>Tout ce qui est gratuit</PlanCheck>
              <PlanCheck>Événements illimités</PlanCheck>
              <PlanCheck>Stats & historique complet</PlanCheck>
              <PlanCheck>Zéro publicité</PlanCheck>
            </div>
            <button style={{
              width: '100%', padding: '10px', borderRadius: 9, fontSize: 13,
              fontWeight: 600, fontFamily: fonts.body, cursor: 'pointer',
              background: colors.gold, border: 'none', color: '#111',
            }}>
              Passer en Premium
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{
        padding: '80px 32px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 50% 80% at 50% 100%, ${colors.gold}0a 0%, transparent 70%)`,
        }} />
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: `${colors.gold}12`, border: `0.5px solid ${colors.gold}33`,
          borderRadius: 20, padding: '5px 14px',
          fontSize: 11, color: colors.gold, fontWeight: 500,
          marginBottom: 16, letterSpacing: '0.5px',
        }}>
          <GoldDot size={5} pulse />
          Rejoins la communauté
        </div>
        <h2 style={{
          fontSize: 36, fontWeight: 700, color: '#fff',
          letterSpacing: '-1px', marginBottom: 10, fontFamily: fonts.title,
        }}>
          Prêt à jouer ?
        </h2>
        <p style={{ fontSize: 14, color: '#484848', marginBottom: 28 }}>
          Trouve ton premier spot en 30 secondes. C'est gratuit, toujours.
        </p>
        <button onClick={user ? () => onGoToApp?.() : onStart} style={{
          fontSize: 14, padding: '12px 28px', borderRadius: 10,
          border: 'none', background: colors.gold,
          color: '#111', fontWeight: 700, cursor: 'pointer', fontFamily: fonts.body,
          position: 'relative', zIndex: 1,
        }}>
          {user ? 'Accéder à la Map →' : 'Trouver un spot maintenant →'}
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: `0.5px solid #1a1a1a`,
        padding: '24px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0c0c0c',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#444' }}>
          <GoldDot size={5} />
          <span style={{ fontFamily: fonts.title }}>YSport</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['À propos', 'Confidentialité', 'CGU', 'Contact'].map(l => (
            <span key={l} style={{ fontSize: 11, color: '#333', cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#2a2a2a' }}>© 2026 YSport</div>
      </footer>

      {/* ── MODAL CONNEXION ── */}
      {showLogin && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowLogin(false)}
        >
          <div
            style={{
              background: '#111', border: '0.5px solid #252525',
              borderRadius: 20, padding: '32px 28px',
              width: '100%', maxWidth: 360,
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: fonts.title, color: '#fff' }}>Connexion</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>Retrouvez vos spots et votre progression</div>
              </div>
              <button
                onClick={() => setShowLogin(false)}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 2, marginTop: -2 }}
              >×</button>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>Email</div>
                <input
                  type="email" value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#161616', border: '0.5px solid #252525',
                    borderRadius: 10, padding: '10px 14px',
                    fontSize: 13, color: '#fff', fontFamily: fonts.body, outline: 'none',
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>Mot de passe</div>
                <input
                  type="password" value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#161616', border: '0.5px solid #252525',
                    borderRadius: 10, padding: '10px 14px',
                    fontSize: 13, color: '#fff', fontFamily: fonts.body, outline: 'none',
                  }}
                />
              </div>

              {loginError && (
                <div style={{
                  fontSize: 12, color: '#d05050',
                  background: '#d0505015', borderRadius: 8, padding: '8px 12px',
                }}>
                  {loginError}
                </div>
              )}

              <button
                type="submit" disabled={loginLoading}
                style={{
                  marginTop: 4, padding: '11px 0', borderRadius: 10,
                  border: 'none', background: loginLoading ? '#333' : colors.gold,
                  color: loginLoading ? '#555' : '#111', fontWeight: 700, fontSize: 13,
                  cursor: loginLoading ? 'not-allowed' : 'pointer',
                  fontFamily: fonts.body, transition: 'background 0.15s',
                }}
              >
                {loginLoading ? 'Connexion…' : 'Se connecter →'}
              </button>

              <div style={{ textAlign: 'center', fontSize: 12, color: '#444', marginTop: 2 }}>
                Pas encore de compte ?{' '}
                <span
                  onClick={() => { setShowLogin(false); onStart() }}
                  style={{ color: colors.gold, cursor: 'pointer', fontWeight: 500 }}
                >
                  Créer un compte
                </span>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Nav link ─────────────────────────────────────────────────────────────────

function NavLink({ children }: { children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false)
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Bientôt disponible"
      style={{
        fontSize: 13,
        color: hovered ? '#555' : '#333',
        cursor: 'not-allowed',
        transition: 'color 0.15s',
        userSelect: 'none',
        opacity: hovered ? 0.6 : 0.45,
      }}
    >
      {children}
    </span>
  )
}

// ─── Map Preview ──────────────────────────────────────────────────────────────

function MapPreview() {
  return (
    <div style={{
      width: '100%', maxWidth: 820, height: 340,
      borderRadius: 16, border: `0.5px solid #2a2a2a`,
      overflow: 'hidden', position: 'relative',
      background: '#1a1a1a', marginTop: 40,
    }}>
      {/* SVG city grid */}
      <svg viewBox="0 0 820 340" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <rect width="820" height="340" fill="#1c1c1e" />
        {/* Blocks */}
        <rect x="20" y="10" width="100" height="60" rx="3" fill="#212121" />
        <rect x="140" y="8" width="80" height="48" rx="3" fill="#212121" />
        <rect x="240" y="14" width="120" height="55" rx="3" fill="#212121" />
        <rect x="380" y="10" width="90" height="62" rx="3" fill="#212121" />
        <rect x="490" y="12" width="110" height="52" rx="3" fill="#212121" />
        <rect x="622" y="8" width="80" height="58" rx="3" fill="#212121" />
        <rect x="720" y="10" width="90" height="50" rx="3" fill="#212121" />
        <rect x="20" y="106" width="80" height="78" rx="3" fill="#212121" />
        <rect x="122" y="100" width="106" height="70" rx="3" fill="#212121" />
        <rect x="248" y="108" width="90" height="72" rx="3" fill="#212121" />
        <rect x="360" y="102" width="118" height="68" rx="3" fill="#212121" />
        <rect x="500" y="106" width="88" height="74" rx="3" fill="#212121" />
        <rect x="610" y="100" width="110" height="70" rx="3" fill="#212121" />
        <rect x="740" y="105" width="75" height="72" rx="3" fill="#212121" />
        <rect x="14" y="216" width="100" height="66" rx="3" fill="#212121" />
        <rect x="136" y="210" width="90" height="72" rx="3" fill="#212121" />
        <rect x="250" y="218" width="116" height="64" rx="3" fill="#212121" />
        <rect x="390" y="212" width="88" height="70" rx="3" fill="#212121" />
        <rect x="500" y="216" width="108" height="66" rx="3" fill="#212121" />
        <rect x="630" y="210" width="90" height="72" rx="3" fill="#212121" />
        <rect x="742" y="215" width="75" height="65" rx="3" fill="#212121" />
        <rect x="14" y="300" width="120" height="40" rx="3" fill="#212121" />
        <rect x="156" y="305" width="90" height="35" rx="3" fill="#212121" />
        <rect x="268" y="300" width="110" height="40" rx="3" fill="#212121" />
        <rect x="400" y="304" width="95" height="36" rx="3" fill="#212121" />
        <rect x="516" y="300" width="108" height="40" rx="3" fill="#212121" />
        <rect x="648" y="303" width="90" height="37" rx="3" fill="#212121" />
        {/* Streets */}
        <line x1="0" y1="88" x2="820" y2="88" stroke="#272727" strokeWidth="10" />
        <line x1="0" y1="194" x2="820" y2="194" stroke="#272727" strokeWidth="14" />
        <line x1="0" y1="296" x2="820" y2="296" stroke="#272727" strokeWidth="8" />
        <line x1="118" y1="0" x2="118" y2="340" stroke="#272727" strokeWidth="10" />
        <line x1="236" y1="0" x2="236" y2="340" stroke="#272727" strokeWidth="14" />
        <line x1="372" y1="0" x2="372" y2="340" stroke="#272727" strokeWidth="10" />
        <line x1="490" y1="0" x2="490" y2="340" stroke="#272727" strokeWidth="8" />
        <line x1="616" y1="0" x2="616" y2="340" stroke="#272727" strokeWidth="8" />
        <line x1="732" y1="0" x2="732" y2="340" stroke="#272727" strokeWidth="6" />
        {/* Park ellipse */}
        <ellipse cx="410" cy="195" rx="42" ry="22" fill="#182018" />
      </svg>

      {/* Radius ring */}
      <div style={{
        position: 'absolute', zIndex: 2, borderRadius: '50%',
        border: `1px dashed ${colors.gold}33`,
        background: `${colors.gold}05`,
        width: 170, height: 170,
        left: '50%', top: '55%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      {/* Pins */}
      <MapPin label="Léon Blum ⚽" variant="gold" left="50%" top="52%" />
      <MapPin label="Jean Moulin 🏀" left="64%" top="35%" />
      <MapPin label="Running 🎯" variant="event" left="34%" top="68%" />
      <MapPin label="Tennis 🎾" left="74%" top="62%" />

      {/* User dot */}
      <div style={{
        position: 'absolute', zIndex: 7,
        left: '50%', top: '55%', transform: 'translate(-50%, -50%)',
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: colors.gold, border: '2px solid #111',
          boxShadow: `0 0 0 5px ${colors.gold}18`,
        }} />
      </div>

      {/* Top chip */}
      <div style={{
        position: 'absolute', zIndex: 5, top: 14, left: 14,
        background: '#161616ee', border: `0.5px solid #2a2a2a`,
        borderRadius: 8, padding: '7px 11px',
        fontSize: 11, color: '#888',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Paris 11e · 14 spots trouvés
      </div>

      {/* Controls chip */}
      <div style={{
        position: 'absolute', zIndex: 5, top: 14, right: 14,
        background: '#161616ee', border: `0.5px solid #2a2a2a`,
        borderRadius: 8, padding: '7px 11px',
        backdropFilter: 'blur(4px)',
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {['+', '−'].map(s => (
          <div key={s} style={{
            width: 28, height: 28, background: '#1e1e1e',
            border: `0.5px solid #2e2e2e`, borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#555', fontSize: 13, cursor: 'pointer',
          }}>{s}</div>
        ))}
      </div>

      {/* Popup */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%',
        transform: 'translateX(-50%)',
        background: '#161616f0', border: `0.5px solid ${colors.gold}33`,
        borderRadius: 12, padding: '11px 14px',
        display: 'flex', gap: 10, alignItems: 'center',
        width: 260, zIndex: 10,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          width: 40, height: 40, background: '#222', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>⚽</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#eee' }}>Stade Léon Blum</div>
          <div style={{ fontSize: 10, color: '#484848', marginTop: 1 }}>Gratuit · 0.4 km · Disponible maintenant</div>
          <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#555', marginTop: 5 }}>
            <span>Note <b style={{ color: colors.gold }}>4.2</b></span>
            <span>Joueurs <b style={{ color: colors.gold }}>24</b></span>
            <span>Événement <b style={{ color: colors.gold }}>1</b></span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MapPin({ label, variant, left, top }: { label: string; variant?: 'gold' | 'event'; left: string; top: string }) {
  const isGold = variant === 'gold'
  const isEvent = variant === 'event'

  const labelStyle: React.CSSProperties = {
    background: isGold ? colors.gold : isEvent ? '#12122a' : '#1e1e1e',
    border: `0.5px solid ${isGold ? colors.gold : isEvent ? `${colors.blue}44` : '#333'}`,
    borderRadius: 6, padding: '3px 8px',
    fontSize: 10, fontWeight: 500,
    color: isGold ? '#111' : isEvent ? colors.blue : '#bbb',
    whiteSpace: 'nowrap', marginBottom: 3,
  }
  const stemColor = isGold ? colors.gold : isEvent ? `${colors.blue}66` : '#333'
  const dotColor = isGold ? colors.gold : isEvent ? colors.blue : '#333'

  return (
    <div style={{
      position: 'absolute', zIndex: 6,
      left, top,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      transform: 'translate(-50%, -100%)',
    }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ width: 1.5, height: 8, background: stemColor }} />
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, border: '1.5px solid #1a1a1a' }} />
    </div>
  )
}

// ─── Mini Chat ────────────────────────────────────────────────────────────────

function MiniChat() {
  return (
    <div style={{
      flex: 1, background: '#161616', border: `0.5px solid #222`,
      borderRadius: 14, overflow: 'hidden', maxWidth: 320,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 13px', borderBottom: `0.5px solid #1e1e1e`,
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <div style={{ width: 6, height: 6, background: colors.green, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#ccc' }}>Canal · Cachan 94230</div>
          <div style={{ fontSize: 10, color: '#3a3a3a' }}>24 sportifs dans 10 km</div>
        </div>
        <div style={{
          fontSize: 9, color: `${colors.gold}66`,
          background: `${colors.gold}08`, padding: '2px 7px',
          borderRadius: 4, border: `0.5px solid ${colors.gold}15`,
        }}>⏱ 18h restantes</div>
      </div>

      {/* Messages */}
      <div style={{ padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ChatMsg avatar="K" bg="#12122a" color={colors.blue} name="Kevin · 0.4 km">
          Dispo ce soir au <span style={{ background: '#12122a', color: colors.blue, borderRadius: 3, padding: '0 4px', fontSize: 10 }}>⚽ Léon Blum</span> ?
        </ChatMsg>
        <ChatMsg avatar="S" bg="#142014" color={colors.green} name="Sara · 1.2 km">
          Moi ! Je ramène 2 amis 🙌
        </ChatMsg>
        <ChatMsg avatar="M" bg={`${colors.gold}18`} color={colors.gold} name="Vous" right>
          Je suis partant 🔥
        </ChatMsg>
        <ChatMsg avatar="K" bg="#12122a" color={colors.blue} name="Kevin · 0.4 km">
          Événement créé → <span style={{ background: '#12122a', color: colors.blue, borderRadius: 3, padding: '0 4px', fontSize: 10 }}>🎯 5v5 Sam 15h</span>
        </ChatMsg>
      </div>

      {/* Input */}
      <div style={{
        padding: '8px 10px', borderTop: `0.5px solid #1a1a1a`,
        display: 'flex', gap: 6,
      }}>
        <div style={{
          flex: 1, background: '#1a1a1a', border: `0.5px solid #222`,
          borderRadius: 7, padding: '6px 9px', fontSize: 11, color: '#333',
        }}>
          Message dans le canal...
        </div>
        <div style={{
          width: 28, height: 28, background: colors.gold,
          borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </div>
      </div>
    </div>
  )
}

function ChatMsg({
  avatar, bg, color, name, children, right = false,
}: {
  avatar: string; bg: string; color: string; name: string
  children: React.ReactNode; right?: boolean
}) {
  return (
    <div style={{
      display: 'flex', gap: 7,
      flexDirection: right ? 'row-reverse' : 'row',
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700, flexShrink: 0,
      }}>
        {avatar}
      </div>
      <div style={{ textAlign: right ? 'right' : 'left' }}>
        <div style={{ fontSize: 9, color: '#3a3a3a', marginBottom: 2 }}>{name}</div>
        <div style={{
          background: right ? `${colors.gold}12` : '#1e1e1e',
          border: `0.5px solid ${right ? `${colors.gold}22` : '#252525'}`,
          borderRadius: right ? '7px 2px 7px 7px' : '2px 7px 7px 7px',
          padding: '5px 8px', fontSize: 11,
          color: right ? '#dcc878' : '#ccc',
          lineHeight: 1.4, display: 'inline-block',
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES: Array<{ icon: string; bg: string; title: string; desc: string; badge?: 'soon' | 'coming' }> = [
  { icon: '📍', bg: `${colors.gold}15`, title: 'Spots géolocalisés', desc: 'Terrains, salles, pistes — trouve un lieu dispo en temps réel autour de toi, avec disponibilité et affluence live.' },
  { icon: '💬', bg: '#12122a', title: 'Canal communautaire', desc: "Un chat local temporaire (10 km) pour trouver des partenaires, organiser une session, sans quitter l'app.", badge: 'soon' },
  { icon: '🎯', bg: '#142014', title: 'Créer un événement', desc: "Organise un match, une session running ou un workout sur n'importe quel spot référencé en 30 secondes.", badge: 'soon' },
  { icon: '🔥', bg: `${colors.gold}15`, title: 'Workout en live', desc: "Rejoins un workout déjà lancé près de toi ou démarre le tien et invite le canal local à participer.", badge: 'coming' },
  { icon: '🏃', bg: '#12122a', title: 'Tous les sports', desc: "Foot, basket, tennis, running, muscu, yoga, piscine — filtre par sport et trouve exactement ce dont tu as besoin." },
  { icon: '📱', bg: '#142014', title: 'Web & mobile', desc: "Application disponible sur navigateur et bientôt sur iOS et Android — ta session t'accompagne partout.", badge: 'soon' },
]
