import { useState, useRef } from 'react'
import { colors } from '@/theme/theme'

// ─── Icons ───────────────────────────────────────────────
function SearchIcon({ size = 13, color = '#3a3a3a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

// ─── Props ────────────────────────────────────────────────
interface TopbarProps {
  variant?: 'glass' | 'solid'   // glass = glassmorphism flottant, solid = barre pleine map
  mobile?: boolean
  zone?: string
  user?: { initial: string; level: string }
  chatOpen: boolean
  onToggleChat: () => void
  onSearch?: (q: string) => void
  onSearchCity?: (q: string) => void
  onOpenProfile?: () => void
  onLogoClick?: () => void
}

// ─── Component ───────────────────────────────────────────
export default function Topbar({
  variant = 'glass',
  mobile = false,
  zone = 'Paris 11e',
  user = { initial: 'M', level: '⚡' },
  chatOpen,
  onToggleChat,
  onSearch,
  onSearchCity,
  onOpenProfile,
  onLogoClick,
}: TopbarProps) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isSolid = variant === 'solid'

  // Solid (map) : barre pleine flush, pas de zone pill
  // Glass (landing/topbar standalone) : glassmorphism flottant avec zone pill
  const height  = isSolid ? 50 : mobile ? 48 : 54
  const radius  = isSolid ? 0  : mobile ? 14 : 16
  const padding = isSolid ? '0 12px' : mobile ? '0 11px' : '0 14px'
  const gap     = isSolid ? 8  : mobile ? 9  : 11

  const containerStyle: React.CSSProperties = isSolid ? {
    height, borderRadius: radius, padding, gap,
    background: '#141414',
    borderBottom: '0.5px solid #222',
    display: 'flex', alignItems: 'center',
    flexShrink: 0,
  } : {
    height, borderRadius: radius, padding, gap,
    background: 'rgba(8, 8, 8, 0.48)',
    backdropFilter: 'blur(28px) saturate(180%) brightness(1.05)',
    WebkitBackdropFilter: 'blur(28px) saturate(180%) brightness(1.05)',
    border: '0.5px solid rgba(255, 255, 255, 0.055)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 0 0 0.5px rgba(0,0,0,0.4), 0 6px 24px rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center',
    position: 'relative' as const, zIndex: 10,
  }

  return (
    <div style={containerStyle}>
      {/* ── Logo ── */}
      <div
        onClick={onLogoClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
          cursor: onLogoClick ? 'pointer' : 'default',
          opacity: 1, transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { if (onLogoClick) e.currentTarget.style.opacity = '0.75' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
      >
        <div
          style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'rgba(201, 168, 76, 0.10)',
            border: '0.5px solid rgba(201, 168, 76, 0.22)',
            boxShadow: 'inset 0 1px 0 rgba(201,168,76,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
          }}
        >
          🏃
        </div>
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 16, fontWeight: 800,
            color: 'rgba(255,255,255,0.92)',
            letterSpacing: '-0.5px',
          }}
        >
          Y<span style={{
            background: `linear-gradient(135deg, ${colors.gold}, ${colors.gold2})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Sport</span>
        </span>
      </div>

      {/* ── Separator ── */}
      <div style={{ width: '0.5px', height: 18, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

      {/* ── Search ── */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          flex: 1, minWidth: 0,
          display: 'flex', alignItems: 'center', gap: 8,
          background: focused ? 'rgba(201, 168, 76, 0.07)' : 'rgba(255, 255, 255, 0.035)',
          border: `0.5px solid ${focused ? 'rgba(201, 168, 76, 0.25)' : 'rgba(255, 255, 255, 0.06)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(201, 168, 76, 0.06)' : 'none',
          borderRadius: 10,
          height: mobile ? 30 : 34,
          padding: '0 11px',
          cursor: 'text',
          transition: 'all 0.22s',
        }}
      >
        <SearchIcon color={focused ? colors.gold : '#3a3a3a'} />
        <input
          ref={inputRef}
          type="text"
          placeholder={mobile ? 'Chercher un spot...' : 'Ville, code postal... ex: Cachan, 94230'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => onSearch?.(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && inputRef.current?.value.trim()) {
              onSearchCity?.(inputRef.current.value.trim())
              inputRef.current.blur()
            }
          }}
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: 'rgba(240,240,240,0.9)',
            fontSize: 12, fontFamily: "'DM Sans', sans-serif",
            width: '100%', minWidth: 0,
          }}
        />
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>

        {/* Zone pill — masquée en mode solid (map) et sur mobile */}
        {!isSolid && !mobile && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(90, 158, 106, 0.10)',
              border: '0.5px solid rgba(90, 158, 106, 0.20)',
              borderRadius: 8, padding: '3px 8px',
              fontSize: 10, color: 'rgba(90,158,106,0.9)',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            <ZoneDot />
            {zone}
          </div>
        )}

        {/* Chat button */}
        <ChatButton open={chatOpen} mobile={mobile} onClick={onToggleChat} />

        {/* Avatar */}
        <Avatar initial={user.initial} level={user.level} mobile={mobile} onClick={onOpenProfile} />
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────

function ZoneDot() {
  return (
    <div
      style={{
        width: 5, height: 5,
        background: colors.green,
        borderRadius: '50%',
        animation: 'ysport-pulse 1.8s ease-in-out infinite',
      }}
    />
  )
}

function ChatButton({ open, mobile, onClick }: { open: boolean; mobile: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const size = mobile ? 30 : 34
  const radius = mobile ? 9 : 10
  const isActive = open || hovered

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: size, height: size, borderRadius: radius,
        background: isActive ? 'rgba(201,168,76,0.10)' : 'rgba(255,255,255,0.04)',
        border: `0.5px solid ${isActive ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.06)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        color: isActive ? colors.gold : 'rgba(255,255,255,0.35)',
        transition: 'all 0.18s',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <ChatIcon />
      {/* Pip */}
      <div
        style={{
          position: 'absolute', top: 7, right: 7,
          width: 6, height: 6, background: colors.gold,
          borderRadius: '50%', border: '1.5px solid rgba(8,8,8,0.6)',
          animation: 'ysport-pip 2.4s ease-in-out infinite',
        }}
      />
    </button>
  )
}

function Avatar({ initial, level, mobile, onClick }: { initial: string; level: string; mobile: boolean; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false)
  const size = mobile ? 30 : 32
  const fontSize = mobile ? 11 : 12

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'rgba(201,168,76,0.12)',
        border: `1.5px solid ${hovered ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.25)'}`,
        boxShadow: hovered ? '0 0 0 3px rgba(201,168,76,0.10)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Syne', sans-serif",
        fontSize, fontWeight: 700, color: colors.gold,
        cursor: 'pointer', flexShrink: 0,
        transition: 'all 0.18s', position: 'relative',
      }}
    >
      {initial}
      {/* Level badge */}
      <div
        style={{
          position: 'absolute', bottom: -3, right: -3,
          width: 13, height: 13, borderRadius: '50%',
          background: colors.gold,
          border: '1.5px solid rgba(8,8,8,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 6, fontWeight: 700, color: '#111',
        }}
      >
        {level}
      </div>
    </div>
  )
}
