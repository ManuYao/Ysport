import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, sports, fonts, radius } from '@/theme/theme'
import type { SportId } from '@/theme/theme'
import type { Spot, SportEvent, ActiveWorkout } from '@/types'
import type { SidebarTab } from '@/store/useMapStore'

// ─── Props ────────────────────────────────────────────────
interface SidebarProps {
  activeTab:          SidebarTab
  spots:              Spot[]
  events:             SportEvent[]
  workouts:           ActiveWorkout[]
  selectedSpot:       Spot | null
  sportFilters:       SportId[]          // Multi-filtre (max 2)
  frozenSport:        SportId | null     // Sport gelé (3ème clic refusé)
  onToggleSport:      (sport: SportId) => void
  onClearFilters:     () => void
  onClearFrozen:      () => void
  onSelectSpot:       (spot: Spot) => void
  onSetTab:           (tab: SidebarTab) => void
  onViewVenue:        (spot: Spot) => void
}

// ─── Constantes ───────────────────────────────────────────
const TABS: { id: SidebarTab; label: string; icon: string }[] = [
  { id: 'spots',   label: 'Spots',   icon: '📍' },
  { id: 'events',  label: 'Events',  icon: '⚡' },
  { id: 'workout', label: 'Workout', icon: '🏋️' },
]

// Noms courts pour les chips de filtres
export const SPORT_SHORT: Record<string, string> = {
  street:      'Street',
  skate:       'Skate',
  athletisme:  'Athlé',
  foot:        'Foot',
  basket:      'Basket',
  tennis:      'Tennis',
  natation:    'Nata',
  tabletennis: 'Ping',
  petanque:    'Pétanque',
}

// ─── Helpers ──────────────────────────────────────────────
export function sportEmoji(id: string): string {
  return sports.find(s => s.id === id)?.icon ?? '🏅'
}

export function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
}

// ─── Component ────────────────────────────────────────────
export default function Sidebar({
  activeTab, spots, events, workouts, selectedSpot,
  sportFilters, frozenSport,
  onToggleSport, onClearFilters, onClearFrozen,
  onSelectSpot, onSetTab, onViewVenue,
}: SidebarProps) {

  // Reset le frozenSport après 900ms (délai = durée animation)
  useEffect(() => {
    if (!frozenSport) return
    const t = setTimeout(onClearFrozen, 900)
    return () => clearTimeout(t)
  }, [frozenSport, onClearFrozen])

  return (
    <aside style={{
      width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
      background: colors.bg2, borderRight: `0.5px solid ${colors.border}`,
      overflow: 'hidden', position: 'relative',
    }}>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: `0.5px solid ${colors.border}`, flexShrink: 0 }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onSetTab(tab.id)}
              style={{
                flex: 1, padding: '12px 0 10px',
                background: 'transparent', border: 'none',
                borderBottom: active ? `2px solid ${colors.gold}` : '2px solid transparent',
                color:        active ? colors.gold : colors.text2,
                fontFamily:   fonts.body, fontSize: 11,
                fontWeight:   active ? 600 : 400,
                cursor: 'pointer', transition: 'color 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              }}
            >
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Filtre sport (onglet Spots uniquement) ── */}
      {activeTab === 'spots' && (
        <div style={{
          borderBottom: `0.5px solid ${colors.border}`,
          flexShrink: 0,
          background: `rgba(14,14,14,0.7)`,
          backdropFilter: 'blur(12px)',
        }}>
          {/* Header : label + compteur + reset */}
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '7px 12px 4px',
            gap: 6,
          }}>
            <span style={{ fontFamily: fonts.body, fontSize: 10, fontWeight: 500, color: colors.text4, textTransform: 'uppercase', letterSpacing: '0.8px', flex: 1 }}>
              Sports
            </span>
            {sportFilters.length > 0 && (
              <span style={{
                fontFamily: fonts.body, fontSize: 9, fontWeight: 600,
                color: colors.gold, background: colors.goldDim,
                border: `0.5px solid ${colors.goldBorder}`,
                borderRadius: radius.full, padding: '1px 6px',
              }}>
                {sportFilters.length}/2
              </span>
            )}
            <AnimatePresence>
              {sportFilters.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, x: 6 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 6 }}
                  transition={{ duration: 0.18 }}
                  onClick={onClearFilters}
                  style={{
                    padding: '2px 8px',
                    background: 'transparent',
                    border: `0.5px solid ${colors.border3}`,
                    borderRadius: radius.full,
                    color: colors.text3,
                    fontFamily: fonts.body, fontSize: 10,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  ✕ Tout
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Chips sports — emoji + nom court */}
          <div style={{
            display: 'flex', gap: 5,
            overflowX: 'auto', padding: '2px 10px 8px',
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
        </div>
      )}

      {/* ── Contenu ── */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>

        {/* SPOTS */}
        {activeTab === 'spots' && (
          spots.length === 0
            ? <Empty icon="📍" text="Aucun spot dans cette zone" />
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

        {/* EVENTS */}
        {activeTab === 'events' && (
          events.length === 0
            ? <Empty icon="⚡" text="Aucun événement autour de vous" />
            : events.map(ev => <EventCard key={ev.id} event={ev} />)
        )}

        {/* WORKOUT */}
        {activeTab === 'workout' && (
          workouts.length === 0
            ? <Empty icon="🏋️" text="Aucun workout actif près de vous" />
            : workouts.map(w => <WorkoutCard key={w.id} workout={w} />)
        )}
      </div>
    </aside>
  )
}

// ─── Sport Chip ─────────────────────────────────────────
export function SportChip({ icon, label, title, active, frozen, onClick }: {
  icon: string; label: string; title?: string
  active: boolean; frozen: boolean; onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      animate={frozen ? 'frozen' : active ? 'active' : 'idle'}
      variants={{
        idle: {
          scale:       1,
          borderColor: colors.border2,
          boxShadow:   '0 0 0px transparent',
          background:  'rgba(25,25,25,0.8)',
          color:       colors.text3,
        },
        active: {
          scale:       1,
          borderColor: colors.gold,
          boxShadow:   `0 0 8px ${colors.gold}55, inset 0 1px 0 ${colors.gold}22`,
          background:  `linear-gradient(135deg, ${colors.gold}20, ${colors.gold}0a)`,
          color:       colors.gold,
        },
        frozen: {
          scale:       [1, 0.92, 1.04, 0.97, 1],
          x:           [0, -3, 3, -2, 0],
          borderColor: [colors.red, '#ff7070', colors.red, colors.border2],
          boxShadow:   ['0 0 0px #d0505000', '0 0 10px #d05050aa', '0 0 6px #d0505066', '0 0 0px transparent'],
          background:  [`${colors.red}18`, `${colors.red}28`, `${colors.red}10`, 'rgba(25,25,25,0.8)'],
          color:       [colors.red, '#ff8080', colors.red, colors.text3],
          transition:  { duration: 0.5, ease: 'easeOut' },
        },
      }}
      transition={{ duration: 0.2 }}
      style={{
        flexShrink: 0,
        padding: '5px 10px',
        border: '0.5px solid',
        borderRadius: radius.full,
        fontFamily: fonts.body,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        backdropFilter: 'blur(8px)',
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1px' }}>{label}</span>
    </motion.button>
  )
}

// ─── Spot Card ────────────────────────────────────────────
export function SpotCard({ spot, selected, onClick, onViewVenue }: {
  spot: Spot; selected: boolean; onClick: () => void; onViewVenue: () => void
}) {
  const mainSport = spot.sports[0]

  return (
    <div
      onClick={onClick}
      style={{
        padding: selected ? '10px 12px 10px 10px' : '10px 12px',
        borderBottom: `0.5px solid ${colors.border}`,
        borderLeft: selected ? `2px solid ${colors.gold}` : '2px solid transparent',
        background: selected ? colors.goldDim : 'transparent',
        cursor: 'pointer', transition: 'background 0.15s, border-left-color 0.15s',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = colors.bg3 }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      {/* Ligne 1 : nom + distance */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>{sportEmoji(mainSport)}</span>
          <span style={{
            fontFamily: fonts.body, fontSize: 12, fontWeight: 600,
            color: selected ? colors.gold : colors.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{spot.name}</span>
        </div>
        <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.text2, flexShrink: 0 }}>
          {formatDist(spot.distanceKm)}
        </span>
      </div>

      {/* Ligne 2 : type + district */}
      <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.text3, marginBottom: 6, paddingLeft: 20 }}>
        {spot.type} · {spot.district}
      </div>

      {/* Ligne 3 : stats + badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 20 }}>
        {spot.activeCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 5, height: 5, background: colors.green, borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.green }}>{spot.activeCount} actifs</span>
          </div>
        )}
        {spot.free && (
          <span style={{
            fontFamily: fonts.body, fontSize: 10, color: colors.green, background: colors.greenDim,
            border: `0.5px solid ${colors.greenBorder}`, borderRadius: radius.sm, padding: '1px 5px',
          }}>Gratuit</span>
        )}
        {!spot.free && spot.pricePerHour && (
          <span style={{
            fontFamily: fonts.body, fontSize: 10, color: colors.text2,
            background: colors.bg4, border: `0.5px solid ${colors.border2}`,
            borderRadius: radius.sm, padding: '1px 5px',
          }}>{spot.pricePerHour}€/h</span>
        )}
        {spot.rating > 0 && (
          <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.text2 }}>
            ★ {spot.rating.toFixed(1)}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onViewVenue() }}
          style={{
            marginLeft: 'auto', fontFamily: fonts.body, fontSize: 10,
            color: colors.gold, background: 'transparent',
            border: `0.5px solid ${colors.goldBorder}`,
            borderRadius: radius.sm, padding: '2px 7px', cursor: 'pointer',
          }}
        >Voir →</button>
      </div>
    </div>
  )
}

// ─── Event Card ───────────────────────────────────────────
export function EventCard({ event }: { event: SportEvent }) {
  return (
    <div style={{ padding: '10px 12px', borderBottom: `0.5px solid ${colors.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 13 }}>{sportEmoji(event.sport)}</span>
        <span style={{
          fontFamily: fonts.body, fontSize: 12, fontWeight: 600,
          color: colors.text, flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{event.name}</span>
        {event.isLive && (
          <span style={{
            fontFamily: fonts.body, fontSize: 9, fontWeight: 700,
            color: colors.red, background: colors.redDim,
            border: `0.5px solid ${colors.redBorder}`,
            borderRadius: radius.sm, padding: '1px 5px', flexShrink: 0,
          }}>LIVE</span>
        )}
        {event.isSponsor && !event.isLive && (
          <span style={{
            fontFamily: fonts.body, fontSize: 9,
            color: colors.gold, background: colors.goldDim,
            border: `0.5px solid ${colors.goldBorder}`,
            borderRadius: radius.sm, padding: '1px 5px', flexShrink: 0,
          }}>Sponsor</span>
        )}
      </div>
      <div style={{ paddingLeft: 20 }}>
        <div style={{ fontFamily: fonts.body, fontSize: 11, color: colors.text2, marginBottom: 3 }}>
          Par {event.organizer}
          {event.scheduledAt && ` · ${event.scheduledAt}`}
          {event.startsIn     && ` · ${event.startsIn}`}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.text3 }}>
            👥 {event.participantCount}{event.maxParticipants ? `/${event.maxParticipants}` : ''}
          </span>
          {event.description && (
            <span style={{
              fontFamily: fonts.body, fontSize: 10, color: colors.text3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{event.description}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Workout Card ─────────────────────────────────────────
export function WorkoutCard({ workout }: { workout: ActiveWorkout }) {
  const pct = Math.min(workout.elapsedMin / workout.durationMin, 1)

  return (
    <div style={{ padding: '10px 12px', borderBottom: `0.5px solid ${colors.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          fontFamily: fonts.body, fontSize: 10, fontWeight: 700,
          color: workout.color, background: `${workout.color}18`,
          border: `0.5px solid ${workout.color}44`,
          borderRadius: radius.sm, padding: '2px 7px',
        }}>{workout.mode}</span>
        <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text }}>
          {workout.spotName}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 5, height: 5, background: colors.red, borderRadius: '50%', display: 'inline-block' }} />
          <span style={{ fontFamily: fonts.body, fontSize: 10, color: colors.red }}>EN COURS</span>
        </span>
      </div>
      <div style={{ height: 3, background: colors.bg4, borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct * 100}%`,
          background: workout.color, borderRadius: 2, transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.text2 }}>
          ⏱ {workout.elapsedMin}min / {workout.durationMin}min
        </span>
        <span style={{ fontFamily: fonts.body, fontSize: 11, color: colors.text2 }}>
          👥 {workout.participantCount}
        </span>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────
function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 20px', gap: 10,
    }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <span style={{ fontFamily: fonts.body, fontSize: 12, color: colors.text3, textAlign: 'center' }}>
        {text}
      </span>
    </div>
  )
}
