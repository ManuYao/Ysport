import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, fonts, sports as ALL_SPORTS } from '@/theme/theme'
import { useAuth } from '@/contexts/AuthContext'
import { fetchProfile } from '@/lib/api'
import type { ProfileData } from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
}

// Constantes de disciplines par sport
const SPORT_META: Record<string, { icon: string; color: string; tip: string }> = {
  muscu:    { icon: '🏋️', color: `linear-gradient(90deg,${colors.gold},${colors.gold2})`,  tip: '💡 Ajoute 1 session dos pour passer Avancé' },
  running:  { icon: '🏃', color: `linear-gradient(90deg,${colors.green},#7dc98a)`,          tip: '💡 Passe à 3 sorties/sem pour atteindre Elite' },
  foot:     { icon: '⚽', color: `linear-gradient(90deg,${colors.green},#7dc98a)`,          tip: '💡 Organise un tournoi pour +120 pts' },
  basket:   { icon: '🏀', color: `linear-gradient(90deg,${colors.blue},#a0a8ff)`,           tip: '💡 Rejoint un défi communautaire' },
  tennis:   { icon: '🎾', color: `linear-gradient(90deg,${colors.blue},#a0a8ff)`,           tip: '💡 Essaie un double pour débloquer Régulier' },
  natation: { icon: '🏊', color: `linear-gradient(90deg,${colors.blue},#a0a8ff)`,           tip: '💡 Nage 3x/sem pour débloquer Nage Confirmé' },
  yoga:     { icon: '🧘', color: `linear-gradient(90deg,${colors.green},#7dc98a)`,          tip: '💡 Régularité = progression rapide en yoga' },
  velo:     { icon: '🚴', color: `linear-gradient(90deg,${colors.orange},#d0a060)`,         tip: '💡 Ajoute une sortie route pour progresser' },
}

export default function ProfileModal({ open, onClose }: Props) {
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing]   = useState(false)
  const [editName, setEditName]     = useState('')
  const [editHandle, setEditHandle] = useState('')

  useEffect(() => {
    if (!open || !authUser) return
    setLoading(true)
    fetchProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [open, authUser])

  const user     = profile?.user
  const stats    = profile?.stats
  const badges   = profile?.badges ?? []
  const activity = profile?.activity ?? []

  const points          = user?.points ?? authUser?.points ?? 0
  const nextLevelPoints = user?.nextLevelPoints ?? authUser?.nextLevelPoints ?? 1000
  const pct             = nextLevelPoints ? Math.min(100, Math.round((points / nextLevelPoints) * 100)) : 100
  const remaining       = nextLevelPoints ? nextLevelPoints - points : 0

  const displaySports  = user?.sports?.length ? user.sports : (authUser?.sports ?? [])
  const displayName    = user?.name    ?? authUser?.name    ?? '—'
  const displayHandle  = user?.handle  ?? authUser?.handle  ?? ''
  const displayInitial = user?.initial ?? authUser?.initial ?? '?'
  const displayLevel   = user?.level   ?? authUser?.level   ?? 'Junior'
  const displayIcon    = user?.levelIcon ?? authUser?.levelIcon ?? '🥉'

  // Disciplines construites depuis les sports de l'utilisateur
  const disciplines = displaySports.slice(0, 4).map((sportId, i) => {
    const meta = SPORT_META[sportId] ?? { icon: '🏅', color: `linear-gradient(90deg,${colors.gold},${colors.gold2})`, tip: '💡 Continue comme ça !' }
    const sportInfo = ALL_SPORTS.find(s => s.id === sportId)
    const pctVal = Math.min(95, 20 + (stats?.sessions ?? 0) * 3 - i * 10)
    return { icon: meta.icon, name: sportInfo?.name ?? sportId, level: pctVal > 70 ? 'Confirmé' : pctVal > 40 ? 'Intermédiaire' : 'Débutant', pct: Math.max(5, pctVal), color: meta.color, tip: meta.tip, active: i === 0 }
  })

  const statsStrip = [
    { n: String(stats?.sessions ?? 0),  l: 'Sessions'   },
    { n: String(stats?.events   ?? 0),  l: 'Événements' },
    { n: (stats?.points ?? points).toLocaleString('fr-FR'), l: 'Points' },
    { n: String(stats?.badges   ?? 0),  l: 'Badges'     },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="profile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'absolute', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(6px)',
            }}
          />

          {/* Panneau */}
          <motion.div
            key="profile-panel"
            initial={{ x: '110%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '110%', opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 10, right: 10, bottom: 10,
              width: 'min(400px, calc(100% - 20px))',
              zIndex: 1001,
              background: colors.bg2,
              borderRadius: 16,
              border: `0.5px solid ${colors.border2}`,
              boxShadow: '0 8px 48px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.04) inset',
              display: 'flex', flexDirection: 'column',
              fontFamily: fonts.body,
              overflow: 'hidden',
            }}
          >
            {/* NAV */}
            <div style={{ height: 50, background: colors.bg2, borderBottom: `0.5px solid ${colors.border2}`, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, flexShrink: 0 }}>
              <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: `0.5px solid ${colors.border3}`, background: colors.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.text2 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{ fontFamily: fonts.title, fontSize: 15, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 5, height: 5, background: colors.gold, borderRadius: '50%', display: 'inline-block' }} />
                YSport
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: colors.text4, fontSize: 12, gap: 8 }}>
                <span style={{ animation: 'ysport-live 1.2s infinite', display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: colors.gold }} />
                Chargement du profil…
              </div>
            )}

            {/* Contenu */}
            {!loading && (
              <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${colors.border2} transparent` }}>

                {/* HERO */}
                <div style={{ position: 'relative', background: 'linear-gradient(160deg,#1c1809 0%,#0e0e0e 60%)', padding: '24px 16px 0', borderBottom: `0.5px solid #1a1a1a`, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: `1px solid ${colors.gold}18`, top: -60, right: -40, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', border: `1px solid ${colors.gold}18`, top: -20, right: 20, pointerEvents: 'none' }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                    {/* Avatar ring */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 72, height: 72, borderRadius: '50%', background: `conic-gradient(${colors.gold} ${pct}%, #2a2a2a ${pct}%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 3 }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#1a1709', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.title, fontSize: 24, fontWeight: 800, color: colors.gold }}>
                          {displayInitial}
                        </div>
                      </div>
                      <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', background: colors.gold, borderRadius: 8, padding: '2px 7px', fontSize: 8, fontWeight: 700, color: '#111', whiteSpace: 'nowrap', border: `1.5px solid ${colors.bg2}` }}>
                        {displayIcon} {displayLevel}
                      </div>
                    </div>

                    <div style={{ flex: 1, paddingTop: 4 }}>
                      <div style={{ fontFamily: fonts.title, fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 2, lineHeight: 1.1 }}>{displayName}</div>
                      <div style={{ fontSize: 11, color: colors.text4, marginBottom: 6 }}>{displayHandle}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setEditName(displayName); setEditHandle(displayHandle); setIsEditing(true) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'transparent', border: `0.5px solid ${colors.border3}`, borderRadius: 8, padding: '6px 14px', fontSize: 11, color: colors.text2, cursor: 'pointer', fontFamily: 'inherit', marginBottom: isEditing ? 8 : 16 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    {isEditing ? 'Modification en cours…' : 'Modifier le profil'}
                  </button>

                  {/* Formulaire d'édition inline */}
                  {isEditing && (
                    <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: colors.text4, marginBottom: 4 }}>Nom affiché</div>
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          maxLength={40}
                          style={{ width: '100%', boxSizing: 'border-box', background: colors.bg3, border: `0.5px solid ${colors.border2}`, borderRadius: 8, padding: '8px 11px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: colors.text4, marginBottom: 4 }}>Identifiant (@handle)</div>
                        <input
                          value={editHandle}
                          onChange={e => setEditHandle(e.target.value)}
                          maxLength={30}
                          style={{ width: '100%', boxSizing: 'border-box', background: colors.bg3, border: `0.5px solid ${colors.border2}`, borderRadius: 8, padding: '8px 11px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => setIsEditing(false)}
                          style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `0.5px solid ${colors.border3}`, background: 'transparent', fontSize: 11, color: colors.text2, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          style={{ flex: 2, padding: '7px 0', borderRadius: 8, border: 'none', background: colors.gold, fontSize: 11, fontWeight: 700, color: '#111', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* BARRE NIVEAU */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: colors.text4, marginBottom: 5 }}>
                    <span>Niveau {displayLevel}</span>
                    {nextLevelPoints ? (
                      <span style={{ color: colors.gold, fontWeight: 600 }}>{points.toLocaleString('fr-FR')} / {nextLevelPoints.toLocaleString('fr-FR')} pts</span>
                    ) : (
                      <span style={{ color: colors.gold, fontWeight: 600 }}>Niveau maximum 👑</span>
                    )}
                  </div>
                  <div style={{ height: 5, background: colors.bg4, borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${colors.gold},${colors.gold2})`, borderRadius: 5, transition: 'width 1s ease' }} />
                  </div>
                  {remaining > 0 && (
                    <div style={{ fontSize: 10, color: colors.text4, marginTop: 4 }}>
                      Encore <span style={{ color: colors.text2, fontWeight: 500 }}>{remaining} pts</span> pour le niveau suivant
                    </div>
                  )}
                </div>

                {/* STATS STRIP */}
                <div style={{ display: 'flex', borderTop: `0.5px solid #1a1a1a`, borderBottom: `0.5px solid #1a1a1a` }}>
                  {statsStrip.map((s, i) => (
                    <div key={i} style={{ flex: 1, padding: '14px 8px', textAlign: 'center', borderRight: i < statsStrip.length - 1 ? `0.5px solid #1a1a1a` : 'none' }}>
                      <div style={{ fontFamily: fonts.title, fontSize: 18, fontWeight: 700, color: colors.gold, letterSpacing: '-0.5px' }}>{s.n}</div>
                      <div style={{ fontSize: 9, color: colors.text4, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* BADGES */}
                {badges.length > 0 && (
                  <>
                    <div style={{ padding: '16px 16px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 10, color: colors.text4, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Badges</span>
                        <span style={{ fontSize: 10, color: colors.gold, cursor: 'pointer' }}>Voir tout</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14, scrollbarWidth: 'none' }}>
                        {badges.map(b => (
                          <div key={b.id} style={{ flexShrink: 0, width: 72, textAlign: 'center', background: b.earned ? '#1a1709' : colors.bg3, border: `0.5px solid ${b.earned ? colors.goldBorder : colors.border3}`, borderRadius: 10, padding: '10px 6px 8px', opacity: b.earned ? 1 : 0.4, cursor: 'pointer' }}>
                            <span style={{ fontSize: 22, display: 'block', marginBottom: 5 }}>{b.icon}</span>
                            <div style={{ fontSize: 9, color: b.earned ? colors.text2 : colors.text4, lineHeight: 1.3 }}>{b.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ height: '0.5px', background: '#1a1a1a' }} />
                  </>
                )}

                {/* DISCIPLINES */}
                {disciplines.length > 0 && (
                  <>
                    <div style={{ padding: '14px 16px 0' }}>
                      <div style={{ marginBottom: 12 }}>
                        <span style={{ fontSize: 10, color: colors.text4, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Progression par discipline</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, paddingBottom: 14 }}>
                        {disciplines.map((d, i) => (
                          <div key={i} style={{ background: d.active ? '#1a1709' : colors.bg3, border: `0.5px solid ${d.active ? colors.goldBorder : colors.border3}`, borderRadius: 10, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                              <span style={{ fontSize: 16 }}>{d.icon}</span>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 500, color: colors.text }}>{d.name}</div>
                                <div style={{ fontSize: 9, color: colors.gold, marginTop: 1 }}>{d.level}</div>
                              </div>
                            </div>
                            <div style={{ height: 3, background: colors.bg4, borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${d.pct}%`, background: d.color, borderRadius: 3 }} />
                            </div>
                            <div style={{ fontSize: 9, color: colors.text4, marginTop: 4, lineHeight: 1.4 }}>{d.tip}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ height: '0.5px', background: '#1a1a1a' }} />
                  </>
                )}

                {/* ACTIVITÉ */}
                <div style={{ padding: '14px 16px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 10, color: colors.text4, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Activité récente</span>
                  </div>
                  {activity.length === 0 ? (
                    <div style={{ fontSize: 11, color: colors.text4 }}>Aucune activité pour l'instant — lance ton premier timer !</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {activity.map(a => (
                        <div key={a.id} style={{ background: colors.bg3, border: `0.5px solid ${colors.border3}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: a.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                            {a.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#ddd' }}>{a.title}</div>
                            <div style={{ fontSize: 10, color: colors.text4, marginTop: 1 }}>{a.sub}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: colors.gold }}>+{a.pts}</div>
                            <div style={{ fontSize: 9, color: colors.text4 }}>pts</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
