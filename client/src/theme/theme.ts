// ─────────────────────────────────────────────
//  YSport V2 — Charte visuelle centralisée
// ─────────────────────────────────────────────

export const colors = {
  // Fonds
  bg:       '#080808',
  bg2:      '#0e0e0e',
  bg3:      '#141414',
  bg4:      '#191919',
  bg5:      '#1e1e1e',

  // Bordures
  border:   '#1e1e1e',
  border2:  '#222222',
  border3:  '#2a2a2a',

  // Texte
  text:     '#f0f0f0',
  text2:    '#888888',
  text3:    '#777777',
  text4:    '#484848',
  text5:    '#3a3a3a',

  // Or (accent principal)
  gold:         '#C9A84C',
  gold2:        '#E8C96A',
  goldDim:      '#C9A84C15',
  goldBorder:   '#C9A84C30',
  goldDimLight: '#C9A84C22',

  // États
  green:        '#5a9e6a',
  greenDim:     '#122012',
  greenBorder:  '#5a9e6a30',

  red:          '#d05050',
  redDim:       '#1f1111',
  redBorder:    '#d0505030',

  blue:         '#7b8fff',
  blueDim:      '#0d0d20',
  blueBorder:   '#7b8fff30',

  orange:       '#FF6B2B',
  orange2:      '#FF8C4A',
  orangeDim:    '#1C0B00',
  orangeBorder: '#FF6B2B35',
} as const

export const fonts = {
  title: "'Syne', sans-serif",
  body:  "'DM Sans', sans-serif",
} as const

export const radius = {
  sm:     '6px',
  md:     '8px',
  card:   '10px',
  panel:  '12px',
  modal:  '14px',
  large:  '16px',
  xlarge: '20px',
  xxl:    '24px',
  full:   '9999px',
} as const

// Glassmorphism (topbar, chat, popups)
export const glass = {
  bg:           'rgba(8, 8, 8, 0.48)',
  bgStrong:     'rgba(8, 8, 8, 0.55)',
  border:       'rgba(255, 255, 255, 0.055)',
  blur:         'blur(28px) saturate(180%) brightness(1.05)',
  blurStrong:   'blur(32px) saturate(180%)',
  shadow:       '0 1px 0 rgba(255,255,255,0.04) inset, 0 0 0 0.5px rgba(0,0,0,0.4), 0 6px 24px rgba(0,0,0,0.35)',
} as const

// Niveaux utilisateur
export const levels = [
  { name: 'Junior',    min: 0,    max: 999,  icon: '🥉' },
  { name: 'Confirmé',  min: 1000, max: 2499, icon: '⚡' },
  { name: 'Elite',     min: 2500, max: 4999, icon: '🏆' },
  { name: 'Légende',   min: 5000, max: Infinity, icon: '👑' },
] as const

export type Level = typeof levels[number]['name']

// Points par action
export const pointValues = {
  session:           20,
  sessionWithTimer:  45,
  eventCreated:     120,
  eventJoined:       30,
  presenceOnVenue:   10,
  reviewPosted:      15,
  streakBonus:       50,
} as const

// Modes timer
export const timerModes = ['TABATA', 'AMRAP', 'EMOM', 'ForTime', 'MIX'] as const
export type TimerMode = typeof timerModes[number]

// Sports disponibles
export const sports = [
  { id: 'street',      name: 'Street & Fitness',     icon: '🏋️', sub: 'Outdoor training · Parcours · City-stade' },
  { id: 'skate',       name: 'Skatepark & Bicross',  icon: '🛹', sub: 'Skate · BMX' },
  { id: 'athletisme',  name: 'Athlétisme',           icon: '🏃', sub: 'Piste · Stade' },
  { id: 'foot',        name: 'Football',             icon: '⚽', sub: 'Terrain · Street' },
  { id: 'basket',      name: 'Basketball',           icon: '🏀', sub: 'Indoor · Street' },
  { id: 'tennis',      name: 'Tennis',               icon: '🎾', sub: 'Court · Padel' },
  { id: 'natation',    name: 'Natation',             icon: '🏊', sub: 'Piscine · Plein air' },
  { id: 'tabletennis', name: 'Tennis de table',      icon: '🏓', sub: 'Table · Salle' },
  { id: 'petanque',    name: 'Pétanque',             icon: '🎯', sub: 'Terrain · Boulodrome' },
] as const

export type SportId = typeof sports[number]['id']
