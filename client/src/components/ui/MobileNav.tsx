import { colors } from '@/theme/theme'
import type { SidebarTab } from '@/store/useMapStore'

const TABS: { id: SidebarTab; label: string; icon: string }[] = [
  { id: 'spots',   label: 'Spots',   icon: '📍' },
  { id: 'events',  label: 'Events',  icon: '🎯' },
  { id: 'workout', label: 'Workout', icon: '🔥' },
  { id: 'lieu',    label: 'Lieu',    icon: '🏟️' },
]

interface MobileNavProps {
  activeTab: SidebarTab
  onSetTab: (tab: SidebarTab) => void
  hasSelectedSpot: boolean
}

export default function MobileNav({ activeTab, onSetTab, hasSelectedSpot }: MobileNavProps) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 56,
      background: 'rgba(10, 10, 10, 0.95)',
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      borderTop: '0.5px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'stretch',
      zIndex: 500,
    }}>
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        const hasNotif = tab.id === 'lieu' && hasSelectedSpot && !isActive
        return (
          <button
            key={tab.id}
            onClick={() => onSetTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              background: 'none', border: 'none',
              cursor: 'pointer',
              color: isActive ? colors.gold : 'rgba(255,255,255,0.3)',
              fontFamily: 'inherit',
              position: 'relative',
              transition: 'color 0.15s',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 9, fontWeight: isActive ? 600 : 400, letterSpacing: '0.2px' }}>
              {tab.label}
            </span>
            {isActive && (
              <div style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 24, height: 2,
                background: `linear-gradient(90deg, ${colors.gold}, ${colors.gold2})`,
                borderRadius: '0 0 2px 2px',
              }} />
            )}
            {hasNotif && (
              <div style={{
                position: 'absolute', top: 8, right: 'calc(50% - 14px)',
                width: 6, height: 6,
                background: colors.gold,
                borderRadius: '50%',
                border: '1.5px solid #0a0a0a',
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
