export interface Level {
  name: string
  icon: string
  next: number | null
}

export function getLevel(points: number): Level {
  if (points >= 5000) return { name: 'Légende', icon: '👑', next: null }
  if (points >= 2500) return { name: 'Elite',   icon: '🏆', next: 5000 }
  if (points >= 1000) return { name: 'Confirmé', icon: '⚡', next: 2500 }
  return                     { name: 'Junior',   icon: '🥉', next: 1000 }
}
