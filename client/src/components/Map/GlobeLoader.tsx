import { motion, AnimatePresence } from 'framer-motion'
import { colors, fonts } from '@/theme/theme'

interface GlobeLoaderProps {
  visible: boolean
}

// Anneau pulsant — s'étend et disparaît (effet radar/sonar)
function PulseRing({ delay, size }: { delay: number; size: number }) {
  return (
    <motion.div
      initial={{ opacity: 0.6, scale: 0.3 }}
      animate={{ opacity: 0, scale: 1 }}
      transition={{ duration: 2.2, delay, repeat: Infinity, ease: 'easeOut' }}
      style={{
        position:  'absolute',
        width:     size,
        height:    size,
        borderRadius: '50%',
        border:    `1.5px solid ${colors.gold}`,
        top:       '50%',
        left:      '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    />
  )
}

export default function GlobeLoader({ visible }: GlobeLoaderProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            position:       'absolute',
            inset:          0,
            zIndex:         900,
            background:     '#080808',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            40,
            // backdropFilter retiré — combiné avec canvas WebGL = crash iOS Safari
          }}
        >
          {/* Logo */}
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              fontFamily:    fonts.title,
              fontSize:      24,
              fontWeight:    800,
              letterSpacing: 4,
              background:    `linear-gradient(90deg, ${colors.gold}, ${colors.gold2}, ${colors.gold})`,
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
              margin: 0,
            }}
          >
            YSPORT
          </motion.p>

          {/* ── Radar ── */}
          <div style={{ position: 'relative', width: 120, height: 120 }}>

            {/* Anneaux pulsants décalés */}
            <PulseRing size={120} delay={0} />
            <PulseRing size={120} delay={0.7} />
            <PulseRing size={120} delay={1.4} />

            {/* Cercle fond — grille circulaire */}
            <div style={{
              position:     'absolute', inset: 0,
              borderRadius: '50%',
              border:       `1px solid ${colors.gold}22`,
              background:   `radial-gradient(circle, ${colors.gold}08 0%, transparent 70%)`,
            }} />

            {/* Croix de visée (lignes) */}
            <div style={{
              position: 'absolute', top: '50%', left: 8, right: 8,
              height: 1, background: `${colors.gold}20`,
              transform: 'translateY(-50%)',
            }} />
            <div style={{
              position: 'absolute', left: '50%', top: 8, bottom: 8,
              width: 1, background: `${colors.gold}20`,
              transform: 'translateX(-50%)',
            }} />

            {/* Sweep radar — bras rotatif */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              style={{
                position:     'absolute', inset: 0,
                borderRadius: '50%',
                background:   `conic-gradient(from 0deg, transparent 0%, ${colors.gold}00 50%, ${colors.gold}55 75%, ${colors.gold}cc 100%)`,
              }}
            />

            {/* Ligne du bras (par-dessus le sweep) */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '50%', height: 1.5,
                background: `linear-gradient(to right, ${colors.gold}, ${colors.gold}00)`,
                transformOrigin: 'left center',
                borderRadius: 1,
              }}
            />

            {/* Point central */}
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.15, 0.9] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position:     'absolute',
                top:          '50%', left: '50%',
                transform:    'translate(-50%, -50%)',
                width:        10, height: 10,
                borderRadius: '50%',
                background:   colors.gold,
                boxShadow:    `0 0 12px ${colors.gold}cc`,
              }}
            />
          </div>

          {/* Texte */}
          <motion.p
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              fontFamily:    fonts.body,
              fontSize:      11,
              fontWeight:    400,
              color:         colors.text2,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              margin:        0,
            }}
          >
            Recherche des terrains…
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
