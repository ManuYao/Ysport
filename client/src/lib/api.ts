import type { Spot, SportEvent } from '@/types'
import { supabase } from '@/lib/supabase'

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

// ─── Supabase — tables par sport ─────────────────────────────────────────────
// ── RÉGLER LES CORRESPONDANCES TABLE → SPORT ICI ────────────────────────────
const TABLE_SPORT: Record<string, string> = {
  foot:                 'foot',
  basket_bis_1:         'basket',
  basket_bis_2:         'basket',
  musculation:          'street',
  natation:             'natation',
  Nature_Sportif_bis_1: 'tennis',
  Nature_Sportif_bis_2: 'tabletennis',
  Nature_Sportif_bis_3: 'street',
  Nature_Sportif_bis_4: 'street',
  Nature_Sportif_bis_5: 'street',
  petanque:             'petanque',
  running:              'athletisme',
  Skate_Velo:           'skate',
}

const SPORT_TABLES: Record<string, string[]> = {
  foot:        ['foot'],
  basket:      ['basket_bis_1', 'basket_bis_2'],
  natation:    ['natation'],
  athletisme:  ['running'],
  skate:       ['Skate_Velo'],
  petanque:    ['petanque'],
  street:      ['musculation', 'Nature_Sportif_bis_3', 'Nature_Sportif_bis_4', 'Nature_Sportif_bis_5'],
  tennis:      ['Nature_Sportif_bis_1'],
  tabletennis: ['Nature_Sportif_bis_2'],
}

const ALL_TABLES = Object.keys(TABLE_SPORT)

// Mapper une ligne Supabase vers un Spot (essaie plusieurs noms de colonnes)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSpot(r: any, sportId: string, cLat: number, cLng: number): Spot | null {
  const lat = Number(r.latitude ?? r.lat ?? r.Latitude ?? 0)
  const lng = Number(r.longitude ?? r.lng ?? r.Longitude ?? 0)
  if (!lat || !lng) return null

  return {
    id:              String(r.id ?? r.identifiant ?? r.numero_equipement ?? Math.random()),
    name:            String(r.nom ?? r.nom_equipement ?? r.nom_installation ?? r.name ?? 'Équipement sportif'),
    type:            String(r.type_equipement ?? r.type ?? r.libelle_type ?? ''),
    district:        String(r.commune ?? r.commune_nom ?? r.ville ?? ''),
    coords:          { lat, lng },
    sports:          [sportId as never],
    tags:            r.acces_libre === true || r.acces_libre === 'true' ? ['Accès libre'] : [],
    free:            r.acces_libre === true || r.acces_libre === 'true' || r.free === true,
    rating:          0,
    reviewCount:     0,
    visitCount:      0,
    activeCount:     0,
    distanceKm:      Math.round(haversineKm(cLat, cLng, lat, lng) * 10) / 10,
    available:       true,
    hasLiveActivity: false,
    subType:         String(r.type_equipement ?? r.type ?? '').toLowerCase().includes('salle')
                     || String(r.type_equipement ?? r.type ?? '').toLowerCase().includes('gymnase')
                       ? 'salle' : 'outdoor',
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// ─── Auth headers via Supabase session ────────────────────
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function apiFetch<T>(
  path: string,
  init: RequestInit & { signal?: AbortSignal } = {},
  timeoutMs = 8000,
): Promise<T> {
  const internal = new AbortController()
  const timer = setTimeout(() => internal.abort(), timeoutMs)
  if (init.signal) {
    init.signal.addEventListener('abort', () => internal.abort(), { once: true })
  }
  const authHeaders = await getAuthHeaders()
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...authHeaders, ...(init?.headers ?? {}) },
      signal: internal.signal,
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
    return json as T
  } finally {
    clearTimeout(timer)
  }
}

// ─── Shapes retournées par l'API ──────────────────────────
export interface ApiUser {
  id: string
  name: string
  handle: string
  initial: string
  email: string
  points: number
  sports: string[]
  badges: string[]
  level: string
  levelIcon: string
  nextLevelPoints: number | null
}

export interface ProfileData {
  user: ApiUser
  stats: { sessions: number; events: number; points: number; badges: number }
  badges: { id: string; icon: string; name: string; earned: boolean }[]
  activity: { id: string; icon: string; iconBg: string; title: string; sub: string; pts: number }[]
}

// ─── Auth ─────────────────────────────────────────────────
export async function register(
  email: string,
  password: string,
  name: string,
  sports: string[] = [],
  location?: { lat: number; lng: number },
) {
  return apiFetch<{ token: string; user: ApiUser }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, sports, location }),
  })
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  const user = await fetchMe()
  return { user, session: data.session }
}

export async function fetchMe(): Promise<ApiUser | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  try {
    const data = await apiFetch<{ user: ApiUser }>('/api/auth/me')
    return data.user
  } catch {
    // Backend indisponible (serveur local éteint, cold-start Render…)
    // → profil minimal depuis la session Supabase pour que la navigation fonctionne quand même
    const su = session.user
    const name = (su.user_metadata?.name as string | undefined)
      ?? su.email?.split('@')[0]
      ?? 'Sportif'
    return {
      id:              su.id,
      email:           su.email ?? '',
      name,
      handle:          (su.user_metadata?.handle as string | undefined) ?? '',
      initial:         name[0]?.toUpperCase() ?? 'S',
      sports:          (su.user_metadata?.sports as string[] | undefined) ?? [],
      badges:          [],
      points:          0,
      level:           'Junior',
      levelIcon:       '🥉',
      nextLevelPoints: 1000,
    }
  }
}

export async function logout() {
  await supabase.auth.signOut()
}

// ─── Cache mémoire spots — 1 heure ───────────────────────────────────────────
const SPOT_CACHE_TTL = 60 * 60 * 1_000 // 1h en ms
interface CacheEntry { data: Spot[]; expiresAt: number }
const spotCache = new Map<string, CacheEntry>()

function spotCacheKey(lat: number, lng: number, radius: number, sports: string[]): string {
  // On arrondit lat/lng à 3 décimales (~111m) pour regrouper les requêtes proches
  return `${lat.toFixed(3)}_${lng.toFixed(3)}_${radius}_${[...sports].sort().join(',')}`
}

// ─── Spots — Supabase (toute la France, tables par sport) ────────────────────
export async function fetchSpotsFromGouv(
  lat: number, lng: number, radius = 5,
  sport?: string | string[] | null,
  signal?: AbortSignal,
  limit = 100,
): Promise<Spot[]> {
  const latDelta = radius / 111
  const lngDelta = radius / (111 * Math.cos(lat * Math.PI / 180))

  // Normalise sport en array, déduplique les tables via Set
  const sportIds = Array.isArray(sport) ? sport : (sport ? [sport] : [])

  // ── Cache 1h ─────────────────────────────────────────────
  const cacheKey = spotCacheKey(lat, lng, radius, sportIds)
  const cached = spotCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.data
  const tables = sportIds.length === 0
    ? ALL_TABLES
    : (() => {
        const set = new Set<string>()
        for (const id of sportIds) {
          for (const t of (SPORT_TABLES[id] ?? [])) set.add(t)
        }
        return set.size > 0 ? [...set] : ALL_TABLES
      })()

  // Mode Éco mobile : requêtes Supabase en batches séquentiels (3 tables à la fois)
  // Évite le pic CPU réseau de 13 requêtes simultanées qui freeze les mobiles bas de gamme
  const isMobileEnv = typeof window !== 'undefined' && (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent))
  const BATCH_SIZE = isMobileEnv ? 3 : tables.length  // desktop = tout en parallèle

  async function queryTable(tableName: string): Promise<Spot[]> {
    const q = supabase
      .from(tableName)
      .select('*')
      .gte('latitude', lat - latDelta).lte('latitude', lat + latDelta)
      .gte('longitude', lng - lngDelta).lte('longitude', lng + lngDelta)
      .limit(limit)

    const { data, error } = await (signal ? q.abortSignal(signal) : q)

    if (error) {
      if (!error.message.toLowerCase().includes('abort')) {
        console.warn(`Supabase [${tableName}]:`, error.message)
      }
      return []
    }

    const sportId = TABLE_SPORT[tableName] ?? 'street'
    return (data ?? []).flatMap(r => {
      const spot = rowToSpot(r, sportId, lat, lng)
      return spot ? [spot] : []
    })
  }

  // Découpe les tables en batches et exécute séquentiellement sur mobile
  const allResults: Spot[][] = []
  for (let i = 0; i < tables.length; i += BATCH_SIZE) {
    if (signal?.aborted) break
    const batch = tables.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(batch.map(queryTable))
    allResults.push(...batchResults)
  }
  const results = allResults

  const spots = results.flat()
  // Mise en cache uniquement si on a obtenu des résultats (évite de cacher des réponses vides dues au rate-limit)
  if (spots.length > 0) {
    spotCache.set(cacheKey, { data: spots, expiresAt: Date.now() + SPOT_CACHE_TTL })
  }
  return spots
}

export async function fetchReviews(spotId: string) {
  return apiFetch<Review[]>(`/api/spots/${encodeURIComponent(spotId)}/reviews`)
}

export async function postReview(spotId: string, rating: number, text: string, sport?: string) {
  return apiFetch(`/api/spots/${encodeURIComponent(spotId)}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating, text, sport }),
  })
}

export interface Review {
  id: string
  userId: string
  userName: string
  userInitial: string
  userLevel: string
  rating: number
  text: string
  sport?: string
  createdAt: string
}

// ─── Events ───────────────────────────────────────────────
export async function fetchEvents(spotId?: string): Promise<SportEvent[]> {
  const qs = spotId ? `?spotId=${encodeURIComponent(spotId)}` : ''
  return apiFetch<SportEvent[]>(`/api/events${qs}`)
}

export async function createEvent(payload: {
  spotId: string
  spotName?: string
  name: string
  sport: string
  type?: string
  maxParticipants?: number
  scheduledAt?: string
  description?: string
}) {
  return apiFetch('/api/events', { method: 'POST', body: JSON.stringify(payload) })
}

export async function joinEvent(eventId: string) {
  return apiFetch(`/api/events/${eventId}/join`, { method: 'POST' })
}

// ─── User ─────────────────────────────────────────────────
export async function fetchProfile(): Promise<ProfileData> {
  return apiFetch<ProfileData>('/api/user/profile')
}

export async function addPoints(reason: string, opts?: { spotId?: string; eventId?: string; label?: string }) {
  return apiFetch<{ points: number; level: string; levelIcon: string; earned: number }>(
    '/api/user/points',
    { method: 'POST', body: JSON.stringify({ reason, ...opts }) }
  )
}

// ─── Stats globales DB ─────────────────────────────────────
export async function fetchGlobalStats(): Promise<{ totalSpots: number; totalCities: number }> {
  const tableNames = Object.keys(TABLE_SPORT) // 13 tables

  // Compte total de spots (count exact par table, en parallèle)
  const counts = await Promise.all(
    tableNames.map(t =>
      supabase
        .from(t)
        .select('*', { count: 'exact', head: true })
        .then(({ count }) => count ?? 0)
    )
  )
  const totalSpots = counts.reduce((a, b) => a + b, 0)

  // Villes uniques : on extrait la colonne commune sur 5 grandes tables
  const cityTables = ['foot', 'running', 'natation', 'basket_bis_1', 'musculation']
  const cityResults = await Promise.all(
    cityTables.map(t =>
      supabase
        .from(t)
        .select('commune')
        .limit(1000)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ data }) => (data ?? []).map((r: any) => r.commune as string).filter(Boolean))
    )
  )
  const totalCities = new Set(cityResults.flat().map(c => c.trim().toLowerCase())).size

  return { totalSpots, totalCities }
}
