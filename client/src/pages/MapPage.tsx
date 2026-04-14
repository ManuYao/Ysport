import { useEffect, useRef, useState, useCallback } from 'react'
import { colors } from '@/theme/theme'
import { useMapStore } from '@/store/useMapStore'
import { useAuth } from '@/contexts/AuthContext'
import { useGeolocation } from '@/hooks/useGeolocation'
import { fetchSpotsFromGouv, fetchEvents } from '@/lib/api'
import { MAPBOX_TOKEN } from '@/lib/env'
import Topbar from '@/components/ui/Topbar'
import ChatPanel from '@/components/Chat/ChatPanel'
import Sidebar from '@/components/Map/Sidebar'
import MapView from '@/components/Map/MapView'
import SpotPopup from '@/components/Map/SpotPopup'
import ToastQueue from '@/components/Map/ToastQueue'
import VenueModal from '@/components/Venue/VenueModal'
import ProfileModal from '@/components/Profile/ProfileModal'
import AuthPromptModal from '@/components/Profile/AuthPromptModal'
import MobileNav from '@/components/ui/MobileNav'
import BottomSheet from '@/components/ui/BottomSheet'
import FilterFAB from '@/components/ui/FilterFAB'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { Spot, LatLng } from '@/types'
import type { SnapPoint } from '@/components/ui/BottomSheet'

const FIRST_TOAST_DELAY  = 8000
const INTER_TOAST_PAUSE  = 12000

interface MapPageProps {
  onGoToLanding?: () => void
  onGoToOnboarding?: () => void
}

export default function MapPage({ onGoToLanding, onGoToOnboarding }: MapPageProps) {
  const store    = useMapStore()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const geo      = useGeolocation()

  const [venueSpot, setVenueSpot]       = useState<Spot | null>(null)
  const [profileOpen, setProfileOpen]   = useState(false)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [apiError, setApiError]         = useState<string | null>(null)
  const [cityName, setCityName]         = useState<string | null>(null)
  const [searchCoords, setSearchCoords]       = useState<LatLng | null>(null)
  const [bottomSheetSnap, setBottomSheetSnap] = useState<SnapPoint>('collapsed')

  // mapCenter = centre + rayon visibles (piloté par GPS puis par moveend de MapView)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; radius: number } | null>(null)
  const boundsTimerRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const sportsPrefiltered = useRef(false)
  // Garantit que le setMapCenter GPS-first ne se déclenche qu'une seule fois
  const gpsInitDone       = useRef(false)

  // ── Pré-filtrage sports depuis l'onboarding (localStorage) ou profil user ──
  useEffect(() => {
    if (sportsPrefiltered.current) return
    if (store.sportFilters.length > 0) { sportsPrefiltered.current = true; return }

    // Source 1 : sports du profil (après login)
    const fromUser = user?.sports ?? []
    // Source 2 : sports sélectionnés pendant l'onboarding (persistés en localStorage)
    let fromStorage: string[] = []
    try {
      const raw = localStorage.getItem('ysport_sports')
      if (raw) fromStorage = JSON.parse(raw) as string[]
    } catch { /* ignore */ }

    const sportsToApply = fromUser.length > 0 ? fromUser : fromStorage
    if (sportsToApply.length === 0) return

    sportsPrefiltered.current = true
    // Max 2 filtres simultanés — on prend les 2 premiers
    sportsToApply.slice(0, 2).forEach(s => store.toggleSportFilter(s as never))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── GPS-first : déclenche le premier fetch dès que la position est connue ──
  useEffect(() => {
    if (!geo.coords || gpsInitDone.current) return
    gpsInitDone.current = true
    setMapCenter({ lat: geo.coords.lat, lng: geo.coords.lng, radius: 10 })
  }, [geo.coords?.lat, geo.coords?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fallback GPS : si pas de position après 8s → Paris par défaut ──
  useEffect(() => {
    const t = setTimeout(() => {
      if (!gpsInitDone.current) {
        gpsInitDone.current = true
        setMapCenter({ lat: 48.8534, lng: 2.3488, radius: 10 })
      }
    }, 8_000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handler debounced reçu depuis MapView via onBoundsChange
  const handleBoundsChange = useCallback((lat: number, lng: number, radius: number) => {
    clearTimeout(boundsTimerRef.current)
    boundsTimerRef.current = setTimeout(() => setMapCenter({ lat, lng, radius }), 500)
  }, [])

  // ── Chargement des spots — basé sur la zone visible ──
  useEffect(() => {
    if (!mapCenter) return
    const controller = new AbortController()
    // cleanedUp distingue "cleanup React" (re-run / démontage) de "timeout API"
    // Si cleanedUp=true : abort volontaire → on ignore silencieusement
    // Si cleanedUp=false : abort forcé par le timeout → on charge les mocks
    let cleanedUp = false
    const timeout = setTimeout(() => controller.abort(), 10_000)
    store.setStoreLoading(true)

    const activeFilters = store.sportFilters.length > 0 ? store.sportFilters : undefined
<<<<<<< HEAD
    const spotLimit     = isMobile ? 30 : 100
=======
    const spotLimit     = isMobile ? 3 : 100
>>>>>>> origin/main

    fetchSpotsFromGouv(mapCenter.lat, mapCenter.lng, mapCenter.radius, activeFilters, controller.signal, spotLimit)
      .then(spots => {
        clearTimeout(timeout)
        if (!cleanedUp) store.loadSpots(spots)
      })
      .catch(err => {
        clearTimeout(timeout)
        // Cleanup React → abort volontaire, on ignore silencieusement
        if (cleanedUp) return
        console.warn('API indisponible:', err instanceof Error ? err.message : String(err))
        store.setStoreLoading(false)
        setApiError('Le service est temporairement indisponible (quota API atteint).\nRéessaie dans quelques minutes.')
      })

    return () => {
      cleanedUp = true
      clearTimeout(timeout)
      controller.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapCenter?.lat, mapCenter?.lng, mapCenter?.radius, store.sportFilters.join(',')])

  // ── Reverse geocoding — ville réelle via Mapbox ──────────
  useEffect(() => {
    if (!geo.coords || searchCoords) return
    const { lat, lng } = geo.coords
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=place&limit=1`)
      .then(r => r.json())
      .then((d: { features?: { text?: string }[] }) => {
        const name = d.features?.[0]?.text
        if (name) setCityName(name)
      })
      .catch(() => {})
  }, [geo.coords?.lat, geo.coords?.lng, searchCoords]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recherche ville (Enter) — forward geocoding Mapbox ────
  async function handleCitySearch(query: string) {
    if (!query.trim()) {
      setSearchCoords(null)
      store.setSearch('')
      return
    }
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=place,postcode&country=fr&limit=1`
      const r = await fetch(url)
      const d = await r.json() as { features?: { center?: [number, number]; text?: string; place_name?: string }[] }
      const feature = d.features?.[0]
      if (feature?.center) {
        const [lng, lat] = feature.center
        setSearchCoords({ lat, lng })          // déclenche le pan visuel dans MapView
        setMapCenter({ lat, lng, radius: 5 })  // déclenche le fetch immédiatement
        // NE PAS écraser cityName : il doit toujours refléter la vraie position de l'utilisateur
      } else {
        // Pas de ville trouvée : filtre par nom de spot
        store.setSearch(query)
      }
    } catch {
      store.setSearch(query)
    }
  }

  // ── Chargement des events ──
  useEffect(() => {
    fetchEvents()
      .then(events => store.loadEvents(events))
      .catch(() => store.setNetworkError('Événements non chargés — service temporairement indisponible.'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toast cycle ──
  useEffect(() => {
    const t = setTimeout(() => store.showNextToast(), FIRST_TOAST_DELAY)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Popup si chargement > 5s (service lent ou quota atteint) ──
  useEffect(() => {
    if (!store.isLoading) return
    const t = setTimeout(() => {
      setApiError('Le chargement prend trop de temps.\nContact Admin : Ya0@gmail.com — réessaie dans quelques minutes.')
    }, 5_000)
    return () => clearTimeout(t)
  }, [store.isLoading])

  function handleToastComplete() {
    store.dismissToast()
    setTimeout(() => store.showNextToast(), INTER_TOAST_PAUSE)
  }

  function handleToastDismiss() {
    store.dismissToast()
    setTimeout(() => store.showNextToast(), INTER_TOAST_PAUSE)
  }

  const handleSelectSpot = useCallback((spot: Spot | null) => {
    store.selectSpot(spot)
    if (isMobile && spot) {
      store.setTab('lieu')
      setVenueSpot(spot)
    }
  }, [isMobile, store])

  // Infos topbar depuis l'utilisateur authentifié ou fallback
  const userZone    = cityName ?? (geo.coords ? 'Votre position' : (user?.handle ?? 'Paris'))
  const userInitial = user?.initial ?? '?'
  const userIcon    = user?.levelIcon ?? '🥉'

  // Données visibles = spots réels Supabase uniquement (pas de mock Paris pour les non-parisiens)
  const visibleSpots = store.filteredSpots

  const popupBottom = isMobile ? 76 : 12

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: colors.bg, overflow: 'hidden', position: 'relative' }}>

      {/* ── Topbar ── */}
      <div style={{ padding: '8px 10px 0', zIndex: 50, position: 'relative', flexShrink: 0 }}>
        <Topbar
          zone={userZone}
          user={{ initial: userInitial, level: userIcon }}
          chatOpen={store.chatOpen}
          onToggleChat={store.toggleChat}
          onSearch={store.setSearch}
          onSearchCity={handleCitySearch}
          onOpenProfile={() => user ? setProfileOpen(true) : setAuthPromptOpen(true)}
          onLogoClick={onGoToLanding}
        />
      </div>

      {/* ── Overlay fermeture chat ── */}
      {store.chatOpen && (
        <div
          onClick={store.toggleChat}
          style={{ position: 'absolute', inset: 0, zIndex: 199, cursor: 'default' }}
        />
      )}

      {/* ── Chat panel ── */}
      <div style={{
        position: 'absolute', top: 72, left: 10, right: 10, zIndex: 200,
        pointerEvents: store.chatOpen ? 'auto' : 'none',
      }}>
        <ChatPanel open={store.chatOpen} zone={userZone} />
      </div>

      {/* ── Corps principal ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', marginTop: 8 }}>

        {/* Sidebar (desktop uniquement) */}
        {!isMobile && (
          <Sidebar
            activeTab={store.activeTab}
            spots={store.filteredSpots}
            events={store.events}
            workouts={store.workouts}
            selectedSpot={store.selectedSpot}
            sportFilters={store.sportFilters}
            frozenSport={store.frozenSport}
            onToggleSport={store.toggleSportFilter}
            onClearFilters={store.clearSportFilters}
            onClearFrozen={store.clearFrozenSport}
            onSelectSpot={spot => { store.selectSpot(spot); store.setTab('spots') }}
            onSetTab={store.setTab}
            onViewVenue={spot => setVenueSpot(spot)}
          />
        )}

        {/* Zone carte */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', zIndex: 1 }}>
          <MapView
            spots={visibleSpots}
            events={store.events}
            selectedSpot={store.selectedSpot}
            onSelectSpot={handleSelectSpot}
            userCoords={geo.coords}
            centerOverride={searchCoords}
            sportFilters={store.sportFilters}
            isLoading={store.isLoading}
            onBoundsChange={handleBoundsChange}
          />

          {/* Indicateur chargement / erreur — visible aussi pendant l'attente GPS */}
          {(!mapCenter || store.isLoading) && (
            <div style={{
              position: 'absolute', top: 10, left: 10, zIndex: 800,
              background: 'rgba(14,14,14,0.88)', border: `0.5px solid ${colors.goldBorder}`,
              borderRadius: 999, padding: '5px 12px 5px 8px',
              backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: colors.gold, display: 'inline-block',
                animation: 'ysport-live 1.2s infinite',
                flexShrink: 0,
              }} />
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: colors.text2 }}>
                {geo.coords ? 'Recherche des terrains…' : 'Localisation en cours…'}
              </span>
            </div>
          )}
          {!store.isLoading && store.loadError && (
            <div style={{
              position: 'absolute', top: 10, left: 10, zIndex: 800,
              background: 'rgba(30,12,12,0.95)', border: `0.5px solid ${colors.red}55`,
              borderRadius: 8, padding: '6px 12px', fontSize: 11,
              backdropFilter: 'blur(8px)', color: colors.red, maxWidth: 260,
            }}>
              ⚠️ {store.loadError}
            </div>
          )}

          {/* Bandeau workouts actifs */}
          {!store.isLoading && store.workouts.length > 0 && (
            <div style={{
              position: 'absolute', top: 10, left: 10, zIndex: 800,
              background: 'rgba(22,17,17,0.9)', border: `0.5px solid ${colors.red}30`,
              borderRadius: 8, padding: '6px 10px',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
              backdropFilter: 'blur(8px)',
            }}>
              <span style={{ width: 5, height: 5, background: colors.red, borderRadius: '50%', display: 'inline-block', animation: 'ysport-live 1.2s infinite' }} />
              <span style={{ color: '#888' }}>
                <b style={{ color: colors.red }}>{store.workouts.length} workouts</b> en cours près de vous
              </span>
            </div>
          )}

          {/* Slot bas : popup OU toast */}
          {store.activeToast ? (
            <ToastQueue
              toast={store.activeToast}
              onDismiss={handleToastDismiss}
              onComplete={handleToastComplete}
              bottomOffset={popupBottom}
            />
          ) : (
            <SpotPopup
              spot={store.selectedSpot}
              onClose={() => { store.selectSpot(null); if (isMobile) store.setTab('spots') }}
              onViewVenue={spot => setVenueSpot(spot)}
              onCreateEvent={spot => console.log('Créer event', spot.name)}
              bottomOffset={popupBottom}
            />
          )}

          {/* Fiche lieu */}
          {venueSpot && (
            <VenueModal
              spot={venueSpot}
              events={store.events}
              userCoords={geo.coords}
              onClose={() => {
                setVenueSpot(null)
                if (isMobile) store.setTab('spots')
              }}
            />
          )}

          {/* Bottom Sheet mobile (filtres + liste) */}
          {isMobile && (
            <BottomSheet
              sportFilters={store.sportFilters}
              frozenSport={store.frozenSport}
              onToggleSport={store.toggleSportFilter}
              onClearFilters={store.clearSportFilters}
              onClearFrozen={store.clearFrozenSport}
              activeTab={store.activeTab}
              onSetTab={store.setTab}
              spots={store.filteredSpots}
              events={store.events}
              workouts={store.workouts}
              selectedSpot={store.selectedSpot}
              onSelectSpot={spot => { store.selectSpot(spot); setVenueSpot(spot) }}
              onViewVenue={spot => setVenueSpot(spot)}
              snapPoint={bottomSheetSnap}
              onSnapChange={setBottomSheetSnap}
            />
          )}

          {/* FAB Filtres mobile */}
          {isMobile && (
            <FilterFAB
              filterCount={store.sportFilters.length}
              bottomOffset={56 + 20}
              onClick={() => setBottomSheetSnap(s => s === 'collapsed' ? 'half' : 'collapsed')}
            />
          )}
        </div>
      </div>

      {/* ── Mobile nav ── */}
      {isMobile && (
        <MobileNav
          activeTab={store.activeTab}
          onSetTab={tab => {
            store.setTab(tab)
            if (tab === 'lieu' && store.selectedSpot) setVenueSpot(store.selectedSpot)
            if (tab !== 'lieu') {
              setVenueSpot(null)
              setBottomSheetSnap('half')
            }
          }}
          hasSelectedSpot={!!store.selectedSpot}
        />
      )}

      {/* Profil */}
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* Auth prompt (user non connecté) */}
      <AuthPromptModal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        onGoToOnboarding={() => { setAuthPromptOpen(false); onGoToOnboarding?.() }}
      />

      {/* Erreur API — quota Supabase atteint */}
      {apiError && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }}>
          <div style={{
            background: '#141414', border: '0.5px solid #2a2a2a',
            borderRadius: 20, padding: '28px 24px', maxWidth: 340, width: '100%',
            boxShadow: '0 16px 60px rgba(0,0,0,0.8)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 36 }}>⚡</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: '#f0f0f0' }}>
              Service indisponible
            </div>
            <div style={{ fontSize: 13, color: '#777', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {apiError}
            </div>
            <button
              onClick={() => { setApiError(null); onGoToLanding?.() }}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 13, border: 'none',
                background: 'linear-gradient(135deg,#C9A84C,#E8C96A)',
                color: '#0a0800', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Retour à l'accueil
            </button>
            <button
              onClick={() => setApiError(null)}
              style={{
                background: 'none', border: 'none', color: '#555',
                fontSize: 12, cursor: 'pointer', padding: 4,
              }}
            >
              Réessayer quand même
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
