import type { SportId } from '@/theme/theme'

// ─── Geo ──────────────────────────────────────────────────
export interface LatLng {
  lat: number
  lng: number
}

// ─── Spot (lieu sportif) ──────────────────────────────────
export interface Spot {
  id: string
  name: string
  type: string          // ex: "Terrain de football · Extérieur"
  district: string      // ex: "Paris 11e"
  coords: LatLng
  sports: SportId[]
  tags: string[]        // ex: ["Éclairé la nuit", "Vestiaires"]
  free: boolean
  pricePerHour?: number // si payant
  rating: number
  reviewCount: number
  visitCount: number    // visites ce mois
  activeCount: number   // joueurs actifs maintenant
  distanceKm: number
  available: boolean
  terrainCount?: number
  hasLiveActivity: boolean
  subType?: 'salle' | 'outdoor'  // Street : distingue salle (🏋️) vs extérieur (🌳)
}

// ─── Event ────────────────────────────────────────────────
export type EventType = 'manual' | 'auto-recurring' | 'auto-challenge'

export interface SportEvent {
  id: string
  spotId: string
  name: string
  type: EventType
  sport: SportId
  organizer: string
  participantCount: number
  maxParticipants?: number
  scheduledAt?: string  // ex: "Sam 15h"
  startsIn?: string     // ex: "Dans 2h"
  isLive: boolean
  description?: string
  isSponsor?: boolean   // event créé par une marque
  sponsorName?: string  // ex: "Adidas"
}

// ─── Workout actif ────────────────────────────────────────
export type WorkoutMode = 'TABATA' | 'AMRAP' | 'EMOM' | 'ForTime' | 'HIIT' | 'Yoga'

export interface ActiveWorkout {
  id: string
  spotId: string
  spotName: string
  mode: WorkoutMode
  elapsedMin: number
  durationMin: number
  participantCount: number
  color: string         // couleur de la barre de progression
}

// ─── Toast ────────────────────────────────────────────────
export type ToastType = 'ad' | 'badge' | 'event'

export interface Toast {
  id: string
  type: ToastType
  icon: string
  iconBg: string
  tag: string
  title: string
  sub: string
  durationMs: number
}

// ─── User ─────────────────────────────────────────────────
export type UserLevel = 'Junior' | 'Confirmé' | 'Elite' | 'Légende'

export interface User {
  id: string
  name: string
  handle: string
  initial: string
  level: UserLevel
  levelIcon: string
  points: number
  nextLevelPoints: number
  district: string
  activeSpotId?: string
}
