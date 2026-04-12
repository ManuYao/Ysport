import { AnimatePresence, motion } from 'framer-motion'
import { colors } from '@/theme/theme'
import type { Spot } from '@/types'

const SPORT_EMOJI: Record<string, string> = {
  foot: '⚽', basket: '🏀', tennis: '🎾',
  running: '🏃', muscu: '🏋️', natation: '🏊', yoga: '🧘', velo: '🚴',
}

interface SpotPopupProps {
  spot: Spot | null
  onClose: () => void
  onViewVenue: (spot: Spot) => void
  onCreateEvent: (spot: Spot) => void
  bottomOffset?: number
}

export default function SpotPopup({ spot, onClose, onViewVenue, onCreateEvent, bottomOffset = 12 }: SpotPopupProps) {
  return (
    <AnimatePresence>
      {spot && (
        <div style={{ position: 'absolute', bottom: bottomOffset, left: 0, right: 0, zIndex: 800, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <motion.div
          key={spot.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width: 'min(290px, calc(100% - 24px))',
            pointerEvents: 'auto',
            cursor: 'alias',
            background: 'rgba(22, 22, 22, 0.94)',
            border: `0.5px solid ${colors.gold}30`,
            borderRadius: 12, padding: '11px 13px',
            display: 'flex', gap: 10, alignItems: 'flex-start',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {/* Icône sport */}
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
            {SPORT_EMOJI[spot.sports[0] ?? 'foot'] ?? '📍'}
          </div>

          {/* Infos */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#eee', marginBottom: 1 }}>{spot.name}</div>
            <div style={{ fontSize: 10, color: '#777', marginBottom: 5 }}>
              {spot.free ? 'Gratuit' : `${spot.pricePerHour}€/h`} · {spot.distanceKm} km · {spot.available ? 'Disponible maintenant' : 'Complet'}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 9, fontSize: 10, color: '#777', marginBottom: 7 }}>
              <span>Note <b style={{ color: colors.gold }}>{spot.rating}</b></span>
              <span>Joueurs <b style={{ color: colors.gold }}>{spot.activeCount}</b></span>
              {spot.hasLiveActivity && <span>Event <b style={{ color: colors.blue }}>1</b></span>}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                onClick={() => onCreateEvent(spot)}
                style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, border: `0.5px solid #252525`, background: 'transparent', color: '#666', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#666' }}
              >
                + Événement
              </button>
              <button
                onClick={() => onViewVenue(spot)}
                style={{ fontSize: 10, padding: '4px 11px', borderRadius: 6, border: `0.5px solid ${colors.gold}`, background: 'transparent', color: colors.gold, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = colors.gold; e.currentTarget.style.color = '#111' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.gold }}
              >
                Voir la fiche
              </button>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: '#1e1e1e', border: `0.5px solid #2a2a2a`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#666', fontSize: 8 }}
          >
            ✕
          </button>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
