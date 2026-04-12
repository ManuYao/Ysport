import { useReducer, useCallback } from 'react'
import type { Spot, SportEvent, ActiveWorkout, Toast } from '@/types'
import type { SportId } from '@/theme/theme'
import { TOAST_QUEUE } from '@/data/mock'

// ─── State ────────────────────────────────────────────────
export type SidebarTab = 'spots' | 'events' | 'workout' | 'lieu'

interface MapState {
  spots:           Spot[]
  filteredSpots:   Spot[]
  events:          SportEvent[]
  workouts:        ActiveWorkout[]
  selectedSpot:    Spot | null
  searchQuery:     string
  sportFilters:    SportId[]        // Multi-filtre (max 2)
  frozenSport:     SportId | null   // Sport qui a déclenché le freeze (3ème clic)
  activeTab:       SidebarTab
  chatOpen:        boolean
  activeToast:     Toast | null
  toastQueueIndex: number
  isLoading:       boolean
  loadError:       string | null
}

// ─── Actions ──────────────────────────────────────────────
type Action =
  | { type: 'SELECT_SPOT';         spot: Spot | null }
  | { type: 'SET_SEARCH';          query: string }
  | { type: 'TOGGLE_SPORT_FILTER'; sport: SportId }
  | { type: 'CLEAR_SPORT_FILTERS' }
  | { type: 'SET_FROZEN_SPORT';    sport: SportId | null }
  | { type: 'SET_TAB';             tab: SidebarTab }
  | { type: 'TOGGLE_CHAT' }
  | { type: 'SHOW_NEXT_TOAST' }
  | { type: 'DISMISS_TOAST' }
  | { type: 'LOAD_SPOTS';          spots: Spot[] }
  | { type: 'LOAD_EVENTS';         events: SportEvent[] }
  | { type: 'SET_LOADING';         value: boolean }
  | { type: 'SET_ERROR';           error: string | null }

// ─── Helpers ──────────────────────────────────────────────
function filterSpots(spots: Spot[], query: string, sportFilters: SportId[]): Spot[] {
  return spots.filter(s => {
    const matchQuery = !query || s.name.toLowerCase().includes(query.toLowerCase())
    // OR logic : visible si au moins 1 sport sélectionné correspond (ou aucun filtre)
    const matchSport = sportFilters.length === 0 || sportFilters.some(f => s.sports.includes(f))
    // Street : exclure les salles intérieures SEULEMENT si aucun autre filtre actif ne correspond à ce spot
    // Ex : street + tabletennis → garder les salles de ping-pong car elles matchent tabletennis
    const matchSubType = !sportFilters.includes('street')
      || s.subType !== 'salle'
      || sportFilters.some(f => f !== 'street' && s.sports.includes(f))
    return matchQuery && matchSport && matchSubType
  })
}

function buildToast(idx: number): Toast {
  const tpl = TOAST_QUEUE[idx % TOAST_QUEUE.length]
  return { ...tpl, id: `toast-${Date.now()}-${idx}` }
}

// ─── Initial state ────────────────────────────────────────
const INITIAL: MapState = {
  spots:           [],
  filteredSpots:   [],
  events:          [],
  workouts:        [],
  selectedSpot:    null,
  searchQuery:     '',
  sportFilters:    [],
  frozenSport:     null,
  activeTab:       'spots',
  chatOpen:        false,
  activeToast:     null,
  toastQueueIndex: 0,
  isLoading:       false,
  loadError:       null,
}

// ─── Reducer ──────────────────────────────────────────────
function reducer(state: MapState, action: Action): MapState {
  switch (action.type) {

    case 'LOAD_SPOTS': {
      const filtered = filterSpots(action.spots, state.searchQuery, state.sportFilters)
      return { ...state, spots: action.spots, filteredSpots: filtered, isLoading: false, loadError: null }
    }

    case 'LOAD_EVENTS':
      return { ...state, events: action.events }

    case 'SET_LOADING':
      return { ...state, isLoading: action.value }

    case 'SET_ERROR':
      return { ...state, isLoading: false, loadError: action.error }

    case 'SELECT_SPOT':
      return { ...state, selectedSpot: action.spot }

    case 'SET_SEARCH': {
      const filtered = filterSpots(state.spots, action.query, state.sportFilters)
      return { ...state, searchQuery: action.query, filteredSpots: filtered }
    }

    case 'TOGGLE_SPORT_FILTER': {
      const { sport } = action
      const current = state.sportFilters
      const isActive = current.includes(sport)

      if (isActive) {
        // Toggle off : retirer le filtre
        const next = current.filter(s => s !== sport)
        return { ...state, sportFilters: next, filteredSpots: filterSpots(state.spots, state.searchQuery, next) }
      }

      if (current.length >= 2) {
        // Max 2 atteint → freeze visuel (ne pas ajouter)
        return { ...state, frozenSport: sport }
      }

      // Ajouter le filtre
      const next = [...current, sport]
      return { ...state, sportFilters: next, filteredSpots: filterSpots(state.spots, state.searchQuery, next) }
    }

    case 'CLEAR_SPORT_FILTERS':
      return { ...state, sportFilters: [], filteredSpots: filterSpots(state.spots, state.searchQuery, []) }

    case 'SET_FROZEN_SPORT':
      return { ...state, frozenSport: action.sport }

    case 'SET_TAB':
      return { ...state, activeTab: action.tab }

    case 'TOGGLE_CHAT':
      return { ...state, chatOpen: !state.chatOpen }

    case 'SHOW_NEXT_TOAST': {
      if (state.activeToast) return state
      const toast = buildToast(state.toastQueueIndex)
      return { ...state, activeToast: toast, toastQueueIndex: state.toastQueueIndex + 1 }
    }

    case 'DISMISS_TOAST':
      return { ...state, activeToast: null }

    default:
      return state
  }
}

// ─── Hook ─────────────────────────────────────────────────
export function useMapStore() {
  const [state, dispatch] = useReducer(reducer, INITIAL)

  const loadSpots        = useCallback((spots: Spot[])          => dispatch({ type: 'LOAD_SPOTS',          spots }),  [])
  const loadEvents       = useCallback((events: SportEvent[])   => dispatch({ type: 'LOAD_EVENTS',         events }), [])
  const setStoreLoading  = useCallback((value: boolean)         => dispatch({ type: 'SET_LOADING',          value }),  [])
  const setStoreError    = useCallback((error: string | null)   => dispatch({ type: 'SET_ERROR',            error }),  [])
  const selectSpot       = useCallback((spot: Spot | null)      => dispatch({ type: 'SELECT_SPOT',          spot }),   [])
  const setSearch        = useCallback((query: string)          => dispatch({ type: 'SET_SEARCH',           query }),  [])
  const toggleSportFilter= useCallback((sport: SportId)         => dispatch({ type: 'TOGGLE_SPORT_FILTER',  sport }),  [])
  const clearSportFilters= useCallback(()                       => dispatch({ type: 'CLEAR_SPORT_FILTERS'          }),  [])
  const clearFrozenSport = useCallback(()                       => dispatch({ type: 'SET_FROZEN_SPORT',     sport: null }), [])
  const setTab           = useCallback((tab: SidebarTab)        => dispatch({ type: 'SET_TAB',              tab }),    [])
  const toggleChat       = useCallback(()                       => dispatch({ type: 'TOGGLE_CHAT'                  }),  [])
  const showNextToast    = useCallback(()                       => dispatch({ type: 'SHOW_NEXT_TOAST'              }),  [])
  const dismissToast     = useCallback(()                       => dispatch({ type: 'DISMISS_TOAST'                }),  [])

  const eventsForSpot = (spotId: string) => state.events.filter(e => e.spotId === spotId)

  return {
    ...state,
    eventsForSpot,
    loadSpots,
    loadEvents,
    setStoreLoading,
    setStoreError,
    selectSpot,
    setSearch,
    toggleSportFilter,
    clearSportFilters,
    clearFrozenSport,
    setTab,
    toggleChat,
    showNextToast,
    dismissToast,
  }
}
