import { motion } from 'framer-motion'
import { colors, fonts, radius } from '@/theme/theme'

interface FilterFABProps {
  filterCount:  number
  onClick:      () => void
  bottomOffset: number
}

export default function FilterFAB({ filterCount, onClick, bottomOffset }: FilterFABProps) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.2 }}
      style={{
        position:       'absolute',
        bottom:         bottomOffset,
        right:          16,
        zIndex:         490,
        display:        'flex',
        alignItems:     'center',
        gap:            7,
        padding:        '10px 16px',
        background:     'rgba(10,10,10,0.9)',
        border:         `0.5px solid rgba(201,168,76,0.3)`,
        borderRadius:   radius.full,
        backdropFilter: 'blur(12px)',
        cursor:         'pointer',
        fontFamily:     fonts.body,
        color:          colors.text,
        fontSize:       12,
        fontWeight:     500,
        boxShadow:      '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="2">
        <line x1="4" y1="6"  x2="20" y2="6"  />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
      Filtres
      {filterCount > 0 && (
        <span style={{
          background:   colors.gold,
          color:        '#111',
          borderRadius: radius.full,
          padding:      '1px 6px',
          fontSize:     10,
          fontWeight:   700,
          lineHeight:   1.4,
        }}>
          {filterCount}
        </span>
      )}
    </motion.button>
  )
}
