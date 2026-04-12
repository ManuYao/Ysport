import { useEffect, useRef } from 'react'
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { colors, sports, fonts, radius } from '@/theme/theme'
import type { SportId } from '@/theme/theme'
import type { Spot, SportEvent, ActiveWorkout } from '@/types'
import type { SidebarTab } from '@/store/useMapStore'
import { SportChip, SpotCard, EventCard, WorkoutCard, SPORT_SHORT } from '@/components/Map/Sidebar'

// ─── Types ────────────────────────────────────────────────
export type SnapPoint = 'collapsed' | 'half' | 'full'

interface BottomSheetProps {
  // Filtres (miroir Sidebar)
  sportFilters:   SportId[]
  frozenSport:    SportId | null
  onToggleSport:  (sport: SportId) => void
  onClearFilters: () => void
  onClearFrozen:  () => void
  // Onglets
  activeTab:      SidebarTab
  onSetTab:       (tab: SidebarTab) => void
  // Données
  spots:          Spot[]
  events:         SportEvent[]
  workouts:       ActiveWorkout[]
  selectedSpot:   Spot | null
  onSelectSpot:   (spot: Spot) => void
  onViewVenue:    (spot: Spot) => void
  // Snap
  snapPoint:      SnapPoint
  onSnapChange:   (snap: SnapPoint) => void
}

// ─── Constantes ───────────────────────────────────────────
const TABS: { id: SidebarTab; label: string; icon: string }[] = [
  { id: 'spots',   label: 'Spots',   icon: '📍' },
  { id: 'events',  label: 'Events',  icon: '⚡' },
  { id: 'workout', label: 'Workout', icon: '🏋️' },
]

const HANDLE_HEIGHT = 44  // zone de drag en px
const NAV_HEIGHT    = 56  // MobileNav

// Calcule les valeurs Y (depuis le haut du container) pour chaque snap point
function getSnapValues(containerH: number) {
  return {
    collapsed: containerH - 60,
    half:      containerH * 0.6,
    full:      containerH * 0.15,
  }
}

// ─── Component ────────────────────────────────────────────
export default function BottomSheet({
  sportFilters, frozenSport, onToggleSport, onClearFilters, onClearFrozen,
  activeTab, onSetTab,
  spots, events, workouts, selectedSpot, onSelectSpot, onViewVenue,
  snapPoint, onSnapChange,
}: BottomSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const y = useMotionValue(9999) // hors écran jusqu'au premier calcul

  // Reset frozenSport après 900ms
  useEffect(() => {
    if (!frozenSport) return
    const t = setTimeout(onClearFrozen, 900)
    return () => clearTimeout(t)
  }, [frozenSport, onClearFrozen])

  // Anime vers le bon snap quand snapPoint change
  useEffect(() => {
    const containerH = containerRef.current?.offsetHeight ?? window.innerHeight - NAV_HEIGHT
    const snaps = getSnapValues(containerH)
    animate(y, snaps[snapPoint], { type: 'spring', damping: 32, stiffness: 420 })
  }, [snapPoint, y])

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    const containerH = containerRef.current?.offsetHeight ?? window.innerHeight - NAV_HEIGHT
    const snaps = getSnapValues(containerH)
    const current = y.get()
    // Trouver le snap le plus proche
    const entries = Object.entries(snaps) as [SnapPoint, number][]
    const [closest] = entries.reduce((acc, cur) =>
      Math.abs(cur[1] - current) < Math.abs(acc[1] - current) ? cur : acc
    )
    // Vélocité rapide vers le bas → collapse
    if (info.velocity.y > 600) { onSnapChange('collapsed'); return }
    // Vélocité rapide vers le haut → full
    if (info.velocity.y < -600) { onSnapChange('full'); return }
    onSnapChange(closest)
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset:    `0 0 ${NAV_HEIGHT}px 0`,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex:   400,
      }}
    >
      <motion.div
        style={{
          y,
          position:       'absolute',
          left:           0,
          right:          0,
          bottom:         0,
          top:            0,
          background:     'rgba(10,10,10,0.93)',
          backdropFilter: 'blur(28px) saturate(160%)',
          borderTop:      `0.5px solid rgba(255,255,255,0.08)`,
          borderRadius:   '20px 20px 0 0',
          pointerEvents:  'auto',
          display:        'flex',
          flexDirection:  'column',
          overflow:       'hidden',
        }}
      >
        {/* ── Poignée de drag ── */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.12}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{
            height:     HANDLE_HEIGHT,
            flexShrink: 0,
            display:    'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor:     'grab',
            touchAction: 'none',
          }}
        >
          <div style={{
            width:        36,
            height:       4,
            background:   'rgba(255,255,255,0.18)',
            borderRadius: radius.full,
          }} />
        </motion.div>

        {/* ── Onglets ── */}
        <div style={{
          display:      'flex',
          borderBottom: `0.5px solid ${colors.border}`,
          flexShrink:   0,
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onSetTab(tab.id)}
                style={{
                  flex:         1,
                  padding:      '10px 0 8px',
                  background:   'transparent',
                  border:       'none',
                  borderBottom: active ? `2px solid ${colors.gold}` : '2px solid transparent',
                  color:        active ? colors.gold : colors.text2,
                  fontFamily:   fonts.body,
                  fontSize:     11,
                  fontWeight:   active ? 600 : 400,
                  cursor:       'pointer',
                  display:      'flex',
                  flexDirection: 'column',
                  alignItems:   'center',
                  gap:          3,
                }}
              >
                <span style={{ fontSize: 14 }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ── Filtres sports (onglet Spots) ── */}
        <AnimatePresence>
          {activeTab === 'spots' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                borderBottom:   `0.5px solid ${colors.border}`,
                flexShrink:     0,
                background:     'rgba(14,14,14,0.7)',
                backdropFilter: 'blur(12px)',
                overflow:       'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px 4px', gap: 6 }}>
                <span style={{
                  fontFamily: fonts.body, fontSize: 10, fontWeight: 500,
                  color: colors.text4, textTransform: 'uppercase', letterSpacing: '0.8px', flex: 1,
                }}>Sports</span>
                {sportFilters.length > 0 && (
                  <>
                    <span style={{
                      fontFamily: fonts.body, fontSize: 9, fontWeight: 600,
                      color: colors.gold, background: colors.goldDim,
                      border: `0.5px solid ${colors.goldBorder}`,
                      borderRadius: radius.full, padding: '1px 6px',
                    }}>{sportFilters.length}/2</span>
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={onClearFilters}
                      style={{
                        padding:    '2px 8px',
                        background: 'transparent',
                        border:     `0.5px solid ${colors.border3}`,
                        borderRadius: radius.full,
                        color:      colors.text3,
                        fontFamily: fonts.body,
                        fontSize:   10,
                        cursor:     'pointer',
                      }}
                    >✕ Tout</motion.button>
                  </>
                )}
              </div>
              <div style={{
                display:       'flex',
                gap:           5,
                overflowX:     'auto',
                padding:       '2px 10px 8px',
                scrollbarWidth: 'none',
              }}>
                {sports.map(s => (
                  <SportChip
                    key={s.id}
                    icon={s.icon}
                    label={SPORT_SHORT[s.id] ?? s.name}
                    title={s.name}
                    active={sportFilters.includes(s.id as SportId)}
                    frozen={frozenSport === s.id}
                    onClick={() => onToggleSport(s.id as SportId)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Liste scrollable ── */}
        <div style={{
          flex:          1,
          overflowY:     'auto',
          scrollbarWidth: 'thin',
          touchAction:   'pan-y',
        }}>
          {activeTab === 'spots' && (
            spots.length === 0
              ? <SheetEmpty icon="📍" text="Aucun spot dans cette zone" />
              : spots.map(spot => (
                  <SpotCard
                    key={spot.id}
                    spot={spot}
                    selected={selectedSpot?.id === spot.id}
                    onClick={() => onSelectSpot(spot)}
                    onViewVenue={() => onViewVenue(spot)}
                  />
                ))
          )}

          {activeTab === 'events' && (
            events.length === 0
              ? <SheetEmpty icon="⚡" text="Aucun événement autour de vous" />
              : events.map(ev => <EventCard key={ev.id} event={ev} />)
          )}

          {activeTab === 'workout' && (
            workouts.length === 0
              ? <SheetEmpty icon="🏋️" text="Aucun workout actif près de vous" />
              : workouts.map(w => <WorkoutCard key={w.id} workout={w} />)
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Empty state interne ──────────────────────────────────
function SheetEmpty({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '40px 20px',
      gap:            10,
    }}>
      <span style={{ fontSize: 26 }}>{icon}</span>
      <span style={{ fontFamily: fonts.body, fontSize: 12, color: colors.text3, textAlign: 'center' }}>
        {text}
      </span>
    </div>
  )
}
