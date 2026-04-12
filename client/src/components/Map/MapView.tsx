import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import mapboxgl from 'mapbox-gl'
import { MAPBOX_TOKEN } from '@/lib/env'
import type { Spot, SportEvent } from '@/types'
import type { SportId } from '@/theme/theme'
import GlobeLoader from './GlobeLoader'

// ─── Config ────────────────────────────────────────────────
// ── RÉGLER LE ZOOM ICI ──────────────────────────────────
const GLOBE_INIT_ZOOM        = 1.5   // zoom départ (vue planète)
const SPOT_LANDING_ZOOM      = 13    // zoom d'arrivée après FlyTo
// ── RÉGLER LA DURÉE DU FLYTO ICI ──────────────────────
const FLYTO_DURATION_MS      = 3500  // durée du vol majestueux (ms)
// ── RÉGLER LE RAYON DE ZONE UTILISATEUR ICI ───────────
const ZONE_RADIUS_KM         = 2     // rayon du cercle doré (km)
// ── SEUIL DE BASCULE GLOBE → MERCATOR ─────────────────
const MERCATOR_ZOOM_THRESHOLD = 5    // au-dessus : mercator (centrage précis), en-dessous : globe (intro)

const DEFAULT_CENTER: [number, number] = [2.3488, 48.8534]  // [lng, lat]  Paris par défaut (si pas de GPS)
const ORANGE = '#FF6B2B'
const GOLD   = '#C9A84C'

// ─── GeoJSON circle (polygon approx) ─────────────────────
function createCircleGeoJSON(
  center: [number, number],
  radiusKm: number,
  points = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lng, lat] = center
  const dx = radiusKm / (111.320 * Math.cos(lat * Math.PI / 180))
  const dy = radiusKm / 110.574
  const coords: [number, number][] = []
  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * 2 * Math.PI
    coords.push([lng + dx * Math.cos(theta), lat + dy * Math.sin(theta)])
  }
  coords[coords.length - 1] = coords[0]
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }
}

// ─── Spot emoji par sport ─────────────────────────────────
const SPORT_EMOJI: Record<string, string> = {
  foot: '⚽', basket: '🏀', tennis: '🎾',
  athletisme: '🏃', street: '🏋️', natation: '🏊',
  tabletennis: '🏓', skate: '🛹', petanque: '🎯',
}

// ─── Marker HTML pour le spot sélectionné ────────────────
function createSelectedEl(spot: Spot): HTMLElement {
  const emoji = SPORT_EMOJI[spot.sports[0] ?? 'foot'] ?? '📍'
  const el    = document.createElement('div')
  el.style.cssText = 'cursor:pointer;pointer-events:none;'
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;transform-origin:bottom center;">
      <div style="
        display:inline-flex;align-items:center;gap:6px;
        background:#1f1f1f;border:1px solid #2e2e2e;
        border-radius:14px;padding:6px 10px;font-size:11px;font-weight:700;
        color:#e8e8e8;font-family:'DM Sans',sans-serif;white-space:nowrap;
        box-shadow:0 12px 26px rgba(0,0,0,0.28);
      ">
        <span style="display:inline-flex;align-items:center;justify-content:center;
          width:20px;height:20px;border-radius:999px;background:#323232;color:${GOLD};
          font-size:11px;">${emoji}</span>
        <span>${spot.name}</span>
      </div>
      <div style="width:2px;height:8px;background:#666;margin-top:4px;border-radius:1px;"></div>
    </div>
  `
  return el
}

function createSpotLabelEl(spot: Spot): HTMLElement {
  const emoji = SPORT_EMOJI[spot.sports[0] ?? 'foot'] ?? '📍'
  const el = document.createElement('div')
  el.style.cssText = 'cursor:pointer;pointer-events:auto;display:flex;flex-direction:column;align-items:center;transform-origin:bottom center;'
  el.innerHTML = `
    <div style="
      display:inline-flex;align-items:center;gap:6px;
      background:#1e1e1e;border:1px solid #2c2c2c;
      border-radius:14px;padding:6px 10px;font-size:11px;font-weight:700;
      color:#f0f0f0;font-family:'DM Sans',sans-serif;white-space:nowrap;
      box-shadow:0 12px 24px rgba(0,0,0,0.26);
    ">
      <span style="display:inline-flex;align-items:center;justify-content:center;
        width:20px;height:20px;border-radius:999px;background:#313131;color:${GOLD};font-size:11px;
      ">${emoji}</span>
      <span>${spot.name}</span>
    </div>
    <div style="width:2px;height:8px;background:#666;margin-top:4px;border-radius:1px;"></div>
  `
  return el
}

// ─── Haversine pour le rayon visible ─────────────────────
function boundsRadiusKm(
  cLat: number, cLng: number,
  neLat: number, neLng: number,
): number {
  const R    = 6371
  const dLat = (neLat - cLat) * Math.PI / 180
  const dLng = (neLng - cLng) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2 + Math.cos(cLat * Math.PI / 180) ** 2 * Math.sin(dLng / 2) ** 2
  return Math.min(2 * R * Math.asin(Math.sqrt(a)), 50)
}

// ─── Props ─────────────────────────────────────────────────
interface MapViewProps {
  spots:           Spot[]
  events:          SportEvent[]
  selectedSpot:    Spot | null
  onSelectSpot:    (spot: Spot) => void
  userCoords?:     { lat: number; lng: number } | null
  centerOverride?: { lat: number; lng: number } | null
  sportFilters?:   SportId[]
  isLoading?:      boolean
  onBoundsChange?: (lat: number, lng: number, radiusKm: number) => void
}

// ─── Helpers GeoJSON ─────────────────────────────────────
function spotsToGeoJSON(spots: Spot[], events: SportEvent[]): GeoJSON.FeatureCollection {
  const eventSpots = new Set(events.map(e => e.spotId))
  return {
    type: 'FeatureCollection',
    features: spots.map(s => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [s.coords.lng, s.coords.lat] },
      properties: {
        id:       s.id,
        name:     s.name,
        sport:    s.sports[0] ?? 'foot',
        hasEvent: eventSpots.has(s.id) ? 1 : 0,
      },
    })),
  }
}

// ─── Component ─────────────────────────────────────────────
export default function MapView({
  spots, events, selectedSpot, onSelectSpot,
  userCoords, centerOverride, sportFilters = [], isLoading = false, onBoundsChange,
}: MapViewProps) {
  const containerRef      = useRef<HTMLDivElement>(null)
  const map               = useRef<mapboxgl.Map | null>(null)
  const userMarkerRef     = useRef<mapboxgl.Marker | null>(null)
  const selectedMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const spotMarkersRef    = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const centeredRef       = useRef(false)
  const firstLoadRef      = useRef(true)   // Pour déclencher le FlyTo une seule fois
  const onBoundsChangeRef = useRef(onBoundsChange)
  const spotsRef          = useRef(spots)
  const onSelectSpotRef   = useRef(onSelectSpot)
  const [mapReady, setMapReady] = useState(false)
  const [mapZoom, setMapZoom]   = useState(GLOBE_INIT_ZOOM)

  // Garder les refs à jour sans recréer les listeners
  useEffect(() => { onBoundsChangeRef.current = onBoundsChange }, [onBoundsChange])
  useEffect(() => { spotsRef.current = spots },                   [spots])
  useEffect(() => { onSelectSpotRef.current = onSelectSpot },     [onSelectSpot])

  // ── Init map (une seule fois) ────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    mapboxgl.accessToken = MAPBOX_TOKEN

    const m = new mapboxgl.Map({
      container:          containerRef.current,
      style:              'mapbox://styles/mapbox/dark-v11',
      center:             DEFAULT_CENTER,
      zoom:               GLOBE_INIT_ZOOM,      // ← vue planète au démarrage
      projection:         'globe' as never,     // ← projection globe Mapbox GL v3
      attributionControl: false,
      dragRotate:         false,
      pitchWithRotate:    false,
    })

    const emitBounds = () => {
      const bounds = m.getBounds()
      if (!bounds) return
      const c  = m.getCenter()
      const ne = bounds.getNorthEast()
      const r  = boundsRadiusKm(c.lat, c.lng, ne.lat, ne.lng)
      onBoundsChangeRef.current?.(c.lat, c.lng, Math.ceil(r))
    }

    m.on('load', () => {
      // ── Cercle zone utilisateur ──────────────────────────
      m.addSource('user-zone', {
        type: 'geojson',
        data: createCircleGeoJSON(DEFAULT_CENTER, ZONE_RADIUS_KM),
      })
      m.addLayer({
        id: 'user-zone-fill', type: 'fill', source: 'user-zone',
        paint: { 'fill-color': GOLD, 'fill-opacity': 0.05 },
      })
      m.addLayer({
        id: 'user-zone-border', type: 'line', source: 'user-zone',
        paint: { 'line-color': GOLD, 'line-opacity': 0.35, 'line-width': 1 },
      })

      // ── Source spots ─────────────────────────────────────
      m.addSource('spots', {
        type:         'geojson',
        data:         { type: 'FeatureCollection', features: [] },
        cluster:      true,
        clusterMaxZoom: 14,
        clusterRadius:  50,
      })

      // Cluster — cercle
      m.addLayer({
        id:     'clusters',
        type:   'circle',
        source: 'spots',
        filter: ['has', 'point_count'],
        paint:  {
          'circle-color': [
            'step', ['get', 'point_count'],
            GOLD, 10, '#E8C96A', 50, ORANGE,
          ],
          'circle-radius': [
            'step', ['get', 'point_count'],
            18, 10, 26, 50, 34,
          ],
          'circle-opacity':       0.88,
          'circle-stroke-width':  1.5,
          'circle-stroke-color':  'rgba(255,255,255,0.12)',
        },
      })

      // Cluster — compteur
      m.addLayer({
        id:     'cluster-count',
        type:   'symbol',
        source: 'spots',
        filter: ['has', 'point_count'],
        layout: {
          'text-field':         '{point_count_abbreviated}',
          'text-font':          ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size':          12,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#111' },
      })

      // Point individuel (zoom lointain, cercles)
      // ── RÉGLER LE ZOOM DE BASCULE CERCLE→BULLE ICI ───────
      m.addLayer({
        id:     'unclustered-point',
        type:   'circle',
        source: 'spots',
        filter: ['!', ['has', 'point_count']],
        paint:   {
          'circle-color':        GOLD,
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            0, 3, 10, 4, 12, 5,
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#1a1a1a',
          'circle-opacity':      0.85,
        },
      })

      // Point sélectionné (orange)
      m.addLayer({
        id:     'selected-point',
        type:   'circle',
        source: 'spots',
        filter: ['==', ['get', 'id'], '___none___'],
        paint:  {
          'circle-color':        ORANGE,
          'circle-radius':       7,
          'circle-stroke-width': 2,
          'circle-stroke-color': `${ORANGE}66`,
          'circle-opacity':      1,
        },
      })

      // ── Curseurs ─────────────────────────────────────────
      m.on('mouseenter', 'clusters',          () => { m.getCanvas().style.cursor = 'pointer' })
      m.on('mouseleave', 'clusters',          () => { m.getCanvas().style.cursor = '' })
      m.on('mouseenter', 'unclustered-point', () => { m.getCanvas().style.cursor = 'pointer' })
      m.on('mouseleave', 'unclustered-point', () => { m.getCanvas().style.cursor = '' })

      // ── Clic cluster → zoom in ───────────────────────────
      m.on('click', 'clusters', (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        if (!features.length) return
        const clusterId = features[0].properties?.cluster_id as number
        ;(m.getSource('spots') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return
          const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number]
          m.easeTo({ center: coords, zoom: (zoom ?? 14) + 1, duration: 700, easing: (t) => t * (2 - t) })
        })
      })

      // ── Clic point → sélectionner le spot ───────────────
      m.on('click', 'unclustered-point', (e) => {
        const spotId = e.features?.[0]?.properties?.id as string | undefined
        if (!spotId) return
        const spot = spotsRef.current.find(s => s.id === spotId)
        if (spot) onSelectSpotRef.current(spot)
      })

      emitBounds()
      m.on('moveend', emitBounds)
      m.on('zoomend', () => {
        const z = m.getZoom()
        setMapZoom(z)
        // Bascule globe (intro) ↔ mercator (navigation spots) selon le zoom
        m.setProjection(z >= MERCATOR_ZOOM_THRESHOLD ? ('mercator' as never) : ('globe' as never))
        emitBounds()
      })
      setMapReady(true)
    })

    map.current = m
    return () => {
      userMarkerRef.current?.remove()
      selectedMarkerRef.current?.remove()
      m.remove()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── FlyTo au premier chargement de spots ─────────────────
  // Priorité : position user > centroïde des spots
  useEffect(() => {
    if (!map.current || !mapReady || spots.length === 0) return
    if (!firstLoadRef.current) return

    if (centeredRef.current) {
      // userCoords est arrivé avant les spots → déjà centré, on arrête
      firstLoadRef.current = false
      return
    }

    firstLoadRef.current = false

    // ── RÉGLER LE ZOOM ET LA DURÉE DU FLYTO ICI ──────────
    if (userCoords) {
      // Position GPS dispo → voler directement sur l'utilisateur
      centeredRef.current = true
      map.current.flyTo({
        center:    [userCoords.lng, userCoords.lat],
        zoom:      SPOT_LANDING_ZOOM,
        duration:  FLYTO_DURATION_MS,
        essential: true,
        easing:    (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      })
    } else {
      // Pas encore de GPS → centroïde des spots comme fallback visuel
      const avgLat = spots.reduce((s, p) => s + p.coords.lat, 0) / spots.length
      const avgLng = spots.reduce((s, p) => s + p.coords.lng, 0) / spots.length
      map.current.flyTo({
        center:    [avgLng, avgLat],
        zoom:      SPOT_LANDING_ZOOM - 2, // zoom un peu plus éloigné que pour un spot précis
        duration:  FLYTO_DURATION_MS,
        essential: true,
        easing:    (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      })
    }
  }, [spots, mapReady, userCoords]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Correction vers la position réelle (si GPS arrive après le FlyTo centroïde) ─
  useEffect(() => {
    if (!map.current || !userCoords || centeredRef.current) return
    centeredRef.current = true
    // ── RÉGLER LA DURÉE DE CORRECTION ICI ────────────────
    map.current.flyTo({
      center:    [userCoords.lng, userCoords.lat],
      zoom:      SPOT_LANDING_ZOOM,
      duration:  FLYTO_DURATION_MS,
      essential: true,
      easing:    (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    })
  }, [userCoords])

  // ── Marqueur + cercle utilisateur ────────────────────────
  useEffect(() => {
    if (!map.current || !mapReady || !userCoords) return
    const center: [number, number] = [userCoords.lng, userCoords.lat]
    const src = map.current.getSource('user-zone') as mapboxgl.GeoJSONSource | undefined
    src?.setData(createCircleGeoJSON(center, ZONE_RADIUS_KM))

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(center)
    } else {
      const el = document.createElement('div')
      el.style.cssText = 'width:14px;height:14px;position:relative;'
      el.innerHTML = `
        <div class="ysport-user-pulse-ring"></div>
        <div style="width:14px;height:14px;border-radius:50%;background:${GOLD};
          border:2.5px solid #1c1c1e;box-shadow:0 0 0 3px ${GOLD}33;
          position:relative;z-index:1;"></div>
      `
      userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(center)
        .addTo(map.current)
    }
  }, [userCoords, mapReady])

  // ── Pan vers centerOverride (recherche ville) ────────────
  useEffect(() => {
    if (!map.current || !centerOverride) return
    map.current.easeTo({
      center:   [centerOverride.lng, centerOverride.lat],
      zoom:     14,
      duration: 750,
      easing:   (t) => t * (2 - t),
    })
  }, [centerOverride?.lat, centerOverride?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pan vers le spot sélectionné ────────────────────────
  useEffect(() => {
    if (!map.current || !selectedSpot) return
    map.current.easeTo({
      center:   [selectedSpot.coords.lng, selectedSpot.coords.lat],
      zoom:     Math.max(map.current.getZoom(), 15),
      duration: 700,
      easing:   (t) => t * (2 - t),
    })
  }, [selectedSpot?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mise à jour source GeoJSON ───────────────────────────
  useEffect(() => {
    if (!map.current || !mapReady) return
    const src = map.current.getSource('spots') as mapboxgl.GeoJSONSource | undefined
    if (!src) return
    // OR logic : visible si au moins un de ses sports est dans le filtre
    const filtered = sportFilters.length > 0
      ? spots.filter(s => sportFilters.some(f => s.sports.includes(f)))
      : spots
    src.setData(spotsToGeoJSON(filtered, events))
  }, [spots, events, sportFilters, mapReady])

  // ── Marqueurs spot HTML (zoom rapproché) ─────────────────
  useEffect(() => {
    if (!map.current || !mapReady) return
    const m       = map.current
    const visible = mapZoom >= 14
    const filtered = sportFilters.length > 0
      ? spots.filter(s => sportFilters.some(f => s.sports.includes(f)))
      : spots
    const visibleSpots = selectedSpot
      ? filtered.filter(s => s.id !== selectedSpot.id)
      : filtered
    const activeIds = new Set(visibleSpots.map(s => s.id))

    if (!visible) {
      spotMarkersRef.current.forEach(marker => marker.remove())
      spotMarkersRef.current.clear()
      return
    }

    spotMarkersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove()
        spotMarkersRef.current.delete(id)
      }
    })

    visibleSpots.forEach(spot => {
      if (spotMarkersRef.current.has(spot.id)) {
        spotMarkersRef.current.get(spot.id)!.setLngLat([spot.coords.lng, spot.coords.lat])
        return
      }
      const el = createSpotLabelEl(spot)
      el.addEventListener('click', () => onSelectSpotRef.current(spot))
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom', offset: [0, -4] })
        .setLngLat([spot.coords.lng, spot.coords.lat])
        .addTo(m)
      spotMarkersRef.current.set(spot.id, marker)
    })
  }, [spots, sportFilters, selectedSpot, mapReady, mapZoom, onSelectSpot])

  // ── Spot sélectionné : dot orange + bulle nom ────────────
  useEffect(() => {
    if (!map.current || !mapReady) return

    map.current.setFilter('selected-point',
      selectedSpot
        ? ['==', ['get', 'id'], selectedSpot.id]
        : ['==', ['get', 'id'], '___none___'],
    )

    map.current.setFilter('unclustered-point',
      selectedSpot
        ? ['&&', ['!', ['has', 'point_count']], ['!=', ['get', 'id'], selectedSpot.id]]
        : ['!', ['has', 'point_count']],
    )

    if (selectedSpot) {
      if (!selectedMarkerRef.current) {
        const el = createSelectedEl(selectedSpot)
        selectedMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom', offset: [0, -4] })
          .setLngLat([selectedSpot.coords.lng, selectedSpot.coords.lat])
          .addTo(map.current)
      } else {
        const el    = selectedMarkerRef.current.getElement()
        const icon  = el.querySelector<HTMLElement>('div > div:first-child span:first-child')
        const label = el.querySelector<HTMLElement>('div > div:first-child span:last-child')
        const emoji = SPORT_EMOJI[selectedSpot.sports[0] ?? 'foot'] ?? '📍'
        if (icon)  icon.textContent  = emoji
        if (label) label.textContent = selectedSpot.name
        selectedMarkerRef.current.setLngLat([selectedSpot.coords.lng, selectedSpot.coords.lat])
      }
    } else {
      selectedMarkerRef.current?.remove()
      selectedMarkerRef.current = null
    }
  }, [selectedSpot, mapReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bouton recentrage ─────────────────────────────────────
  function handleRecenter() {
    if (!map.current) return
    const c = userCoords ?? { lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] }
    map.current.easeTo({
      center:   [c.lng, c.lat],
      zoom:     SPOT_LANDING_ZOOM,
      duration: 750,
      easing:   (t) => t * (2 - t),
    })
  }

  const btnStyle: CSSProperties = {
    width: 32, height: 32, background: '#1e1e1e',
    border: '0.5px solid #333', borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#666', fontSize: 14,
    userSelect: 'none', transition: 'background 0.15s, color 0.15s',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Loader globe — affiché pendant le chargement initial */}
      <GlobeLoader visible={isLoading && !mapReady} />

      {/* Contrôles zoom custom */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <button style={btnStyle} title="Zoom avant"
          onClick={() => map.current?.zoomIn()}
          onMouseEnter={e => { e.currentTarget.style.background = '#282828'; e.currentTarget.style.color = '#888' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.color = '#666' }}
        >+</button>
        <button style={btnStyle} title="Zoom arrière"
          onClick={() => map.current?.zoomOut()}
          onMouseEnter={e => { e.currentTarget.style.background = '#282828'; e.currentTarget.style.color = '#888' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.color = '#666' }}
        >−</button>
        <button style={{ ...btnStyle, fontSize: 11 }} title="Recentrer sur ma position"
          onClick={handleRecenter}
          onMouseEnter={e => { e.currentTarget.style.background = '#282828'; e.currentTarget.style.color = '#888' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.color = '#666' }}
        >◎</button>
      </div>
    </div>
  )
}
