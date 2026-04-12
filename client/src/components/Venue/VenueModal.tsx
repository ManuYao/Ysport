import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, fonts } from '@/theme/theme'
import type { Spot, SportEvent, LatLng } from '@/types'
import { fetchReviews } from '@/lib/api'
import type { Review } from '@/lib/api'
import { haversineDistance } from '@/hooks/useGeolocation'

// ─── Slides emoji par sport ───────────────────────────────
const SPORT_SLIDES: Record<string, string[]> = {
  foot:     ['⚽', '🏟️', '🌙'],
  basket:   ['🏀', '🏀', '🏟️'],
  running:  ['🏃', '🌿', '🌄'],
  muscu:    ['🏋️', '💪', '🔥'],
  tennis:   ['🎾', '🏟️', '🌞'],
  natation: ['🏊', '💧', '🌊'],
  yoga:     ['🧘', '🌿', '☀️'],
  velo:     ['🚴', '🌲', '🏔️'],
}
const SLIDE_GRADS = [
  'linear-gradient(135deg,#1a2a0a,#0a1a0a)',
  'linear-gradient(135deg,#0a1a2a,#050a1a)',
  'linear-gradient(135deg,#1a1005,#0a0a00)',
]

// ─── Affluence mock ───────────────────────────────────────
const AFF_HOURS  = ['6h','8h','10h','12h','14h','16h','18h','20h','22h']
const AFF_LEVELS = [12, 28, 42, 72, 55, 38, 88, 92, 58]
const AFF_NOW    = 6

const GEOFENCE_RADIUS_KM = 0.1  // 100 m

interface Props {
  spot: Spot | null
  events: SportEvent[]
  userCoords?: LatLng | null
  onClose: () => void
}

export default function VenueModal({ spot, events, userCoords, onClose }: Props) {
  const [slideIdx,  setSlideIdx]  = useState(0)
  const [geoSecs,   setGeoSecs]   = useState(80 * 60)
  const [mapsOpen,  setMapsOpen]  = useState(false)
  const [reviews,   setReviews]   = useState<Review[]>([])
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Distance réelle utilisateur ↔ lieu
  const realDistKm = (userCoords && spot)
    ? haversineDistance(userCoords, spot.coords)
    : null
  const userIsPresent = realDistKm !== null && realDistKm < GEOFENCE_RADIUS_KM

  const slides     = spot ? (SPORT_SLIDES[spot.sports[0]] ?? SPORT_SLIDES.foot) : []
  const spotEvents = events.filter(e => e.spotId === spot?.id)

  useEffect(() => {
    if (!spot) return
    setSlideIdx(0)
    setGeoSecs(80 * 60)
    setMapsOpen(false)
    setReviews([])
    if (autoRef.current) clearInterval(autoRef.current)
    autoRef.current = setInterval(() => setSlideIdx(i => (i + 1) % slides.length), 4500)
    // Charger les avis depuis l'API
    fetchReviews(spot.id).then(setReviews).catch(() => setReviews([]))
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [spot?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer géofencing — tourne seulement si l'utilisateur est présent
  useEffect(() => {
    if (!spot || !userIsPresent) return
    const t = setInterval(() => setGeoSecs(s => s > 0 ? s - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [spot?.id, userIsPresent])

  function fmtGeo(s: number) {
    const h  = Math.floor(s / 3600)
    const m  = Math.floor((s % 3600) / 60)
    const sc = s % 60
    return h
      ? `${h}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`
      : `${m}:${String(sc).padStart(2,'0')}`
  }

  function bump(dir: 1 | -1) {
    if (autoRef.current) clearInterval(autoRef.current)
    setSlideIdx(i => (i + dir + slides.length) % slides.length)
  }

  function handleGoogleMaps() {
    if (!spot) return
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${spot.coords.lat},${spot.coords.lng}&travelmode=walking`,
      '_blank'
    )
    setMapsOpen(true)
  }

  const stars = (n: number) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n))

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const d = Math.floor(diff / 86400000)
    if (d >= 7)  return `Il y a ${Math.floor(d/7)} sem.`
    if (d >= 1)  return `Il y a ${d}j`
    const h = Math.floor(diff / 3600000)
    if (h >= 1)  return `Il y a ${h}h`
    return `Il y a ${Math.floor(diff / 60000)} min`
  }

  if (!spot) return null

  return (
    <AnimatePresence>
      {/* Backdrop flouté — cliquable pour fermer */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, zIndex: 900,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(6px)',
        }}
      />

      {/* Panneau flottant */}
      <motion.div
        key={spot.id}
        initial={{ x: '110%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '110%', opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 10, right: 10, bottom: 10,
          width: 'min(400px, calc(100% - 20px))',
          zIndex: 901,
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
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 7, border: `0.5px solid ${colors.border3}`, background: colors.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.text2 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span style={{ fontSize: 13, fontWeight: 500, color: colors.text2 }}>Fiche du lieu</span>
          <div style={{ marginLeft: 'auto', fontFamily: fonts.title, fontSize: 15, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, background: colors.gold, borderRadius: '50%', display: 'inline-block' }} />
            YSport
          </div>
        </div>

        {/* SCROLL */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${colors.border2} transparent` }}>

          {/* GALERIE */}
          <div style={{ position: 'relative', height: 210, background: colors.bg3, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ display: 'flex', height: '100%', transform: `translateX(-${slideIdx * 100}%)`, transition: 'transform 0.38s cubic-bezier(0.4,0,0.2,1)' }}>
              {slides.map((emoji, i) => (
                <div key={i} style={{ minWidth: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: SLIDE_GRADS[i % SLIDE_GRADS.length] }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 30%,rgba(14,14,14,0.8) 100%)' }} />
                  <span style={{ position: 'relative', zIndex: 1, fontSize: 58 }}>{emoji}</span>
                </div>
              ))}
            </div>

            {/* Badge prix */}
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, background: spot.free ? colors.green : colors.gold, borderRadius: 7, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#fff' }}>
              {spot.free ? 'Gratuit' : `${spot.pricePerHour}€/h`}
            </div>

            {/* Actifs */}
            {spot.activeCount > 0 && (
              <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: '#1f1111ee', border: `0.5px solid ${colors.red}55`, borderRadius: 7, padding: '3px 9px', fontSize: 10, fontWeight: 600, color: colors.red, display: 'flex', alignItems: 'center', gap: 4 }}>
                <PulseDot color={colors.red} />
                {spot.activeCount} actifs
              </div>
            )}

            {/* Arrows */}
            <div style={{ position: 'absolute', top: '50%', width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 10px', transform: 'translateY(-50%)', zIndex: 10, pointerEvents: 'none' }}>
              <button onClick={() => bump(-1)} style={arrowBtn}>‹</button>
              <button onClick={() => bump(1)}  style={arrowBtn}>›</button>
            </div>

            {/* Dots */}
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 10 }}>
              {slides.map((_, i) => (
                <div key={i} style={{ height: 5, width: i === slideIdx ? 16 : 5, borderRadius: i === slideIdx ? 3 : '50%', background: i === slideIdx ? colors.gold : 'rgba(255,255,255,0.2)', transition: 'all 0.2s' }} />
              ))}
            </div>
          </div>

          {/* HERO */}
          <div style={{ padding: '14px 16px', borderBottom: `0.5px solid #1a1a1a` }}>
            <div style={{ fontFamily: fonts.title, fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 2, lineHeight: 1.1 }}>{spot.name}</div>
            <div style={{ fontSize: 11, color: colors.text4, marginBottom: 10 }}>{spot.type} · {spot.district}</div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
              {spot.tags.map(tag => (
                <span key={tag} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, border: `0.5px solid ${colors.border3}`, color: colors.text2, background: colors.bg3 }}>{tag}</span>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: fonts.title, fontSize: 26, fontWeight: 800, color: colors.gold }}>{spot.rating}</span>
              <div>
                <div style={{ color: colors.gold, fontSize: 13, letterSpacing: -1 }}>{stars(spot.rating)}</div>
                <div style={{ fontSize: 10, color: colors.text4, marginTop: 2 }}>{spot.reviewCount} avis · {spot.visitCount} visites ce mois</div>
              </div>
            </div>

            {/* Géofencing — distance réelle */}
            {userIsPresent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: colors.greenDim, border: `0.5px solid ${colors.greenBorder}`, borderRadius: 10, padding: '10px 13px' }}>
                <PulseDot color={colors.green} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: colors.green }}>Tu es détecté dans cette zone</div>
                  <div style={{ fontSize: 10, color: `${colors.green}70`, marginTop: 1 }}>Marqué actif automatiquement</div>
                </div>
                <div style={{ fontFamily: fonts.title, fontSize: 13, fontWeight: 700, color: colors.green, background: `${colors.green}15`, border: `0.5px solid ${colors.greenBorder}`, borderRadius: 6, padding: '4px 8px', flexShrink: 0 }}>
                  {fmtGeo(geoSecs)}
                </div>
              </div>
            ) : realDistKm !== null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: colors.bg4, border: `0.5px solid ${colors.border3}`, borderRadius: 10, padding: '10px 13px' }}>
                <span style={{ fontSize: 16 }}>📍</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: colors.text2 }}>À {realDistKm < 1 ? `${Math.round(realDistKm * 1000)} m` : `${realDistKm.toFixed(1)} km`} de toi</div>
                  <div style={{ fontSize: 10, color: colors.text4, marginTop: 1 }}>Approche à moins de 100m pour activer</div>
                </div>
              </div>
            ) : null}
          </div>

          {/* STATS */}
          <div style={{ display: 'flex', borderBottom: `0.5px solid #1a1a1a`, borderTop: `0.5px solid #1a1a1a` }}>
            {[
              { n: spot.terrainCount ?? 1, l: 'Terrains' },
              { n: spot.activeCount,        l: 'Actifs'   },
              { n: spotEvents.length,       l: 'Events'   },
              { n: `${spot.distanceKm}km`,  l: 'De toi'   },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderRight: i < 3 ? `0.5px solid #1a1a1a` : 'none' }}>
                <div style={{ fontFamily: fonts.title, fontSize: 17, fontWeight: 700, color: colors.gold }}>{s.n}</div>
                <div style={{ fontSize: 9, color: colors.text4, marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* ACTIONS */}
          <div style={{ padding: '14px 16px', borderBottom: `0.5px solid #1a1a1a` }}>
            {/* Google Maps */}
            <button
              onClick={handleGoogleMaps}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: 'none', borderRadius: 11, padding: '13px 16px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10, boxShadow: '0 2px 16px rgba(0,0,0,0.25)' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22, border: '0.5px solid #e0e0e0' }}>🗺️</div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Y aller · Google Maps</div>
                <div style={{ fontSize: 10, color: '#666', marginTop: 1 }}>Ouvre l'itinéraire depuis ta position</div>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </button>

            {/* Trajet preview */}
            {mapsOpen && (
              <div style={{ background: colors.blueDim, border: `0.5px solid ${colors.blueBorder}`, borderRadius: 10, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>🚶</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#a0a8ff' }}>Google Maps ouvert · Bon trajet !</div>
                  <div style={{ fontSize: 10, color: `${colors.blue}80`, marginTop: 1 }}>Itinéraire généré · {spot.name}</div>
                </div>
                <span onClick={() => setMapsOpen(false)} style={{ fontSize: 11, color: `${colors.blue}60`, cursor: 'pointer' }}>✕</span>
              </div>
            )}

            {/* Secondaires */}
            <div style={{ display: 'flex', gap: 8 }}>
              <SecBtn gold icon="⏱" label="Lancer timer" />
              <SecBtn icon="📅" label="+ Événement" />
              <SecBtn icon="↗" label="Partager" onClick={() => {
                if (navigator.share) navigator.share({ title: `${spot.name} — YSport`, text: 'Rejoins-moi ici !', url: window.location.href })
              }} />
            </div>
          </div>

          {/* AFFLUENCE */}
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: colors.text4, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Affluence habituelle</span>
              <span style={{ fontSize: 9, color: colors.text4 }}>Aujourd'hui</span>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 52, marginBottom: 6 }}>
              {AFF_HOURS.map((h, i) => {
                const pct   = AFF_LEVELS[i]
                const isNow = i === AFF_NOW
                const fill  = pct > 70 ? colors.gold : pct > 40 ? `${colors.gold}88` : `${colors.gold}44`
                return (
                  <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: '100%', height: Math.round(pct * 0.48) + 4, borderRadius: '3px 3px 0 0', background: isNow ? colors.goldDim : colors.bg4, border: isNow ? `0.5px solid ${colors.goldBorder}` : 'none', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`, borderRadius: '3px 3px 0 0', background: isNow ? colors.gold : fill }} />
                    </div>
                    <span style={{ fontSize: 8, color: isNow ? colors.gold : colors.text4, fontWeight: isNow ? 600 : 400 }}>{h}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 9, color: colors.text4, marginBottom: 14, flexWrap: 'wrap' }}>
              {([['#C9A84C44','Calme'],['#C9A84C88','Modéré'],['#C9A84C','Intense']] as [string,string][]).map(([c,l]) => (
                <span key={l}><span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block', marginRight: 3, verticalAlign: 'middle' }} />{l}</span>
              ))}
              <span style={{ color: colors.gold, fontWeight: 500 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.gold, display: 'inline-block', marginRight: 3, verticalAlign: 'middle' }} />Maintenant</span>
            </div>
          </div>

          <div style={{ height: '0.5px', background: '#1a1a1a' }} />

          {/* EVENTS */}
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: colors.text4, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Événements ici</span>
              <span style={{ fontSize: 10, color: colors.gold, cursor: 'pointer' }}>Voir tout</span>
            </div>
            <div style={{ paddingBottom: 6 }}>
              {spotEvents.length === 0
                ? <div style={{ fontSize: 11, color: colors.text4, paddingBottom: 10 }}>Aucun événement pour ce lieu.</div>
                : spotEvents.map(ev => <EventCard key={ev.id} event={ev} />)
              }
            </div>
          </div>

          <div style={{ height: '0.5px', background: '#1a1a1a' }} />

          {/* REVIEWS */}
          <div style={{ padding: '14px 16px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 14 }}>
              <span style={{ fontSize: 10, color: colors.text4, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Avis · {spot.reviewCount}</span>
              <span style={{ fontSize: 10, color: colors.gold, cursor: 'pointer' }}>Filtrer</span>
            </div>

            {/* Écrire un avis */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: colors.bg3, border: `0.5px dashed ${colors.border3}`, borderRadius: 10, padding: '11px 12px', cursor: 'pointer', fontSize: 11, color: colors.text4, marginBottom: 7 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Laisser un avis sur ce lieu...
            </div>

            {reviews.length === 0 ? (
              <div style={{ fontSize: 11, color: colors.text4, paddingBottom: 10 }}>Aucun avis encore — sois le premier !</div>
            ) : reviews.map(r => (
              <div key={r.id} style={{ background: colors.bg3, border: `0.5px solid ${colors.border3}`, borderRadius: 10, padding: '11px 12px', marginBottom: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: colors.bg4, color: colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{r.userInitial || '?'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#ddd' }}>{r.userName} · {r.userLevel}</div>
                    <div style={{ fontSize: 9, color: colors.text4 }}>{timeAgo(r.createdAt)}</div>
                  </div>
                  <div style={{ color: colors.gold, fontSize: 11, letterSpacing: -1 }}>{stars(r.rating)}</div>
                </div>
                <div style={{ fontSize: 11, color: colors.text2, lineHeight: 1.6 }}>{r.text}</div>
                {r.sport && <div style={{ display: 'inline-flex', alignItems: 'center', background: colors.goldDim, color: colors.gold, border: `0.5px solid ${colors.goldBorder}`, borderRadius: 4, fontSize: 9, padding: '2px 6px', marginTop: 6 }}>{r.sport}</div>}
              </div>
            ))}
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Helpers visuels ─────────────────────────────────────

function PulseDot({ color = colors.red }: { color?: string }) {
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0, animation: 'ysport-live 1.5s infinite' }} />
}

const arrowBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%',
  background: 'rgba(0,0,0,0.65)', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: '#fff', fontSize: 16,
  pointerEvents: 'all', lineHeight: 1,
}

function SecBtn({ icon, label, gold, onClick }: { icon: string; label: string; gold?: boolean; onClick?: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, padding: '9px 6px', borderRadius: 9,
        fontSize: 10, fontWeight: 500, fontFamily: 'inherit',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        border: `0.5px solid ${gold ? (hov ? colors.gold : colors.goldBorder) : (hov ? colors.goldBorder : colors.border3)}`,
        background: gold ? (hov ? colors.gold : colors.goldDim) : 'transparent',
        color: gold ? (hov ? '#111' : colors.gold) : (hov ? colors.gold : colors.text2),
        transition: 'all 0.15s',
      }}
    >
      {icon} {label}
    </button>
  )
}

function EventCard({ event }: { event: SportEvent }) {
  const isAuto = event.type !== 'manual'
  return (
    <div style={{ background: colors.bg3, border: `0.5px solid ${colors.border3}`, borderRadius: 10, padding: '10px 12px', marginBottom: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#ddd', flex: 1 }}>{event.name}</span>
        {event.isLive
          ? <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 500, background: colors.redDim, color: colors.red, border: `0.5px solid ${colors.redBorder}`, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap', flexShrink: 0 }}>
              <PulseDot color={colors.red} /> Live
            </span>
          : isAuto
          ? <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 500, background: colors.orangeDim, color: colors.orange, border: `0.5px solid ${colors.orangeBorder}`, whiteSpace: 'nowrap', flexShrink: 0 }}>Auto</span>
          : event.scheduledAt
          ? <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 500, background: colors.redDim, color: colors.red, border: `0.5px solid ${colors.redBorder}`, whiteSpace: 'nowrap', flexShrink: 0 }}>{event.scheduledAt}</span>
          : null
        }
      </div>
      <div style={{ fontSize: 10, color: colors.text4 }}>
        {event.organizer} · {event.participantCount}{event.maxParticipants ? `/${event.maxParticipants}` : ''} participants
        {event.startsIn && ` · ${event.startsIn}`}
        {event.description && ` · ${event.description}`}
      </div>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `0.5px solid #1e1e1e`, display: 'flex', justifyContent: 'flex-end' }}>
        <button style={{ fontSize: 10, padding: '4px 11px', borderRadius: 6, border: `0.5px solid ${colors.gold}`, background: 'transparent', color: colors.gold, cursor: 'pointer', fontFamily: 'inherit' }}>
          Rejoindre
        </button>
      </div>
    </div>
  )
}
