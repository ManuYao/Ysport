import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimation } from 'framer-motion'
import { colors } from '@/theme/theme'
import type { Toast } from '@/types'

const TYPE_COLORS: Record<Toast['type'], string> = {
  ad:    colors.gold,
  badge: colors.green,
  event: colors.blue,
}

interface ToastQueueProps {
  toast: Toast | null
  onDismiss: () => void
  onComplete: () => void
  bottomOffset?: number
}

export default function ToastQueue({ toast, onDismiss, onComplete, bottomOffset = 12 }: ToastQueueProps) {
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startRef      = useRef<number>(0)
  const remainingRef  = useRef<number>(0)
  const [paused, setPaused] = useState(false)
  const barControls   = useAnimation()

  // Initialise quand un nouveau toast arrive
  useEffect(() => {
    if (!toast) return
    remainingRef.current = toast.durationMs
    startRef.current = Date.now()
    setPaused(false)

    timerRef.current = setTimeout(onComplete, toast.durationMs)
    barControls.start({ width: '0%', transition: { duration: toast.durationMs / 1000, ease: 'linear' } })

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [toast?.id])

  function handlePause() {
    if (paused) return
    setPaused(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    remainingRef.current -= Date.now() - startRef.current
    barControls.stop()
  }

  function handleResume() {
    if (!paused) return
    setPaused(false)
    startRef.current = Date.now()
    timerRef.current = setTimeout(onComplete, remainingRef.current)
    barControls.start({ width: '0%', transition: { duration: remainingRef.current / 1000, ease: 'linear' } })
  }

  if (!toast) return null

  const accentColor = TYPE_COLORS[toast.type]

  return (
    <AnimatePresence>
      <div style={{ position: 'absolute', bottom: bottomOffset, left: 0, right: 0, zIndex: 801, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <motion.div
        key={toast.id}
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.34, 1.4, 0.64, 1] }}
        onMouseEnter={handlePause}
        onMouseLeave={handleResume}
        onTouchStart={handlePause}
        onTouchEnd={handleResume}
        style={{
          width: 'min(290px, calc(100% - 24px))',
          pointerEvents: 'auto',
          cursor: 'alias',
          background: 'rgba(22, 22, 22, 0.94)',
          border: `0.5px solid ${accentColor}20`,
          borderRadius: 12, padding: '11px 12px',
          display: 'flex', gap: 10, alignItems: 'flex-start',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Barre de progression */}
        <motion.div
          initial={{ width: '100%' }}
          animate={barControls}
          style={{
            position: 'absolute', bottom: 0, left: 0,
            height: 2, borderRadius: '0 0 12px 12px',
            background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
          }}
        />

        {/* Icône */}
        <div style={{ width: 40, height: 40, borderRadius: 9, background: toast.iconBg, border: `0.5px solid #222`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {toast.icon}
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 8, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
            {toast.tag}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#ddd', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {toast.title}
          </div>
          <div style={{ fontSize: 10, color: '#777', lineHeight: 1.4 }}>
            {toast.sub}
          </div>
        </div>

        {/* Fermer */}
        <button
          onClick={onDismiss}
          style={{ width: 18, height: 18, borderRadius: '50%', background: '#1e1e1e', border: `0.5px solid #2a2a2a`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#666', fontSize: 8, flexShrink: 0, alignSelf: 'flex-start' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
          onMouseLeave={e => (e.currentTarget.style.background = '#1e1e1e')}
        >
          ✕
        </button>
      </motion.div>
      </div>
    </AnimatePresence>
  )
}
