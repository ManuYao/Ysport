import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { colors } from '@/theme/theme'

// ─── Types ────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  author: string
  initial: string
  avatarBg: string
  avatarColor: string
  distance?: string
  text: string
  isSelf?: boolean
}

interface ChatPanelProps {
  open: boolean
  zone?: string
  userCount?: number
  expiresIn?: string
  messages?: ChatMessage[]
}

// ─── Default messages (demo) ─────────────────────────────
const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    author: 'Kevin', initial: 'K',
    avatarBg: '#12122a', avatarColor: '#7b8fff',
    distance: '0.4 km',
    text: '⚽ Léon Blum',
    isSelf: false,
  },
  {
    id: '2',
    author: 'Sara', initial: 'S',
    avatarBg: '#142014', avatarColor: '#5a9e6a',
    distance: '1.2 km',
    text: 'Moi ! Je ramène 2 amis 🙌',
  },
  {
    id: '3',
    author: 'Vous', initial: 'M',
    avatarBg: '#C9A84C18', avatarColor: '#C9A84C',
    text: 'Je suis partant 🔥',
    isSelf: true,
  },
]

// Replace text that matches "⚽ Léon Blum" with a mention chip
function renderText(text: string) {
  const mentionRx = /(⚽ [\w\s]+|🎯 [\w\s]+|🏀 [\w\s]+)/g
  const parts = text.split(mentionRx)
  return parts.map((part, i) =>
    mentionRx.test(part) ? (
      <span
        key={i}
        style={{
          background: colors.blueDim,
          color: colors.blue,
          borderRadius: 3,
          padding: '0 3px',
          fontSize: 10,
        }}
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

// ─── Component ───────────────────────────────────────────
export default function ChatPanel({
  open,
  zone = 'Paris 11e',
  userCount = 28,
  expiresIn = '18h',
  messages = DEFAULT_MESSAGES,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<ChatMessage[]>(messages)
  const msgsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  function send() {
    const text = input.trim()
    if (!text) return
    setMsgs(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        author: 'Vous', initial: 'M',
        avatarBg: '#C9A84C18', avatarColor: colors.gold,
        text, isSelf: true,
      },
    ])
    setInput('')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          style={{
            background: 'rgba(8, 8, 8, 0.55)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '0.5px solid rgba(255,255,255,0.055)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '11px 14px',
              borderBottom: '0.5px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <div style={{ width: 5, height: 5, background: colors.green, borderRadius: '50%' }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(204,204,204,0.9)' }}>
                Canal · {zone}
              </div>
              <div style={{ fontSize: 9, color: '#555', marginTop: 1 }}>
                {userCount} personnes dans 10 km
              </div>
            </div>
            <div
              style={{
                marginLeft: 'auto', fontSize: 9,
                color: 'rgba(201,168,76,0.5)',
                background: 'rgba(201,168,76,0.06)',
                border: '0.5px solid rgba(201,168,76,0.12)',
                borderRadius: 4, padding: '2px 7px',
              }}
            >
              ⏱ expire dans {expiresIn}
            </div>
          </div>

          {/* Messages */}
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
            {msgs.map(msg => (
              <MessageRow key={msg.id} msg={msg} />
            ))}
            <div ref={msgsEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '8px 12px',
              borderTop: '0.5px solid rgba(255,255,255,0.04)',
              display: 'flex', gap: 6,
            }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Message dans le canal..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.07)',
                borderRadius: 8, padding: '7px 10px',
                color: '#f0f0f0', fontSize: 11,
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            />
            <button
              onClick={send}
              style={{
                width: 28, height: 28, background: colors.gold,
                border: 'none', borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = colors.gold2)}
              onMouseLeave={e => (e.currentTarget.style.background = colors.gold)}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Message row ─────────────────────────────────────────
function MessageRow({ msg }: { msg: ChatMessage }) {
  if (msg.isSelf) {
    return (
      <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 7 }}>
        <div
          style={{
            width: 22, height: 22, borderRadius: '50%',
            background: msg.avatarBg, color: msg.avatarColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700, flexShrink: 0,
          }}
        >
          {msg.initial}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>Vous</div>
          <div
            style={{
              background: '#C9A84C0e',
              border: '0.5px solid #C9A84C1a',
              borderRadius: '7px 2px 7px 7px',
              padding: '5px 9px', fontSize: 11,
              color: '#dcc878', lineHeight: 1.45, display: 'inline-block',
            }}
          >
            {msg.text}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 7 }}>
      <div
        style={{
          width: 22, height: 22, borderRadius: '50%',
          background: msg.avatarBg, color: msg.avatarColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 700, flexShrink: 0,
        }}
      >
        {msg.initial}
      </div>
      <div>
        <div style={{ fontSize: 8, color: '#333', marginBottom: 2 }}>
          {msg.author}{msg.distance ? ` · ${msg.distance}` : ''}
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            borderRadius: '2px 8px 8px 8px',
            padding: '5px 9px', fontSize: 11,
            color: '#bbb', lineHeight: 1.45, display: 'inline-block',
          }}
        >
          {renderText(msg.text)}
        </div>
      </div>
    </div>
  )
}
