import { useState, useEffect, useRef } from 'react'
import type { LatLng } from '@/types'

interface GeolocationState {
  coords: LatLng | null
  error: string | null
  loading: boolean
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({ coords: null, error: null, loading: true })
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ coords: null, error: 'Géolocalisation non supportée', loading: false })
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setState({
          coords:  { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error:   null,
          loading: false,
        })
      },
      err => {
        setState({ coords: null, error: err.message, loading: false })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return state
}

// ─── Haversine distance (km) ──────────────────────────────
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R    = 6371
  const dlat = (b.lat - a.lat) * (Math.PI / 180)
  const dlng = (b.lng - a.lng) * (Math.PI / 180)
  const sinA = Math.sin(dlat / 2)
  const sinB = Math.sin(dlng / 2)
  const c    = 2 * Math.asin(
    Math.sqrt(sinA * sinA + Math.cos(a.lat * (Math.PI / 180)) * Math.cos(b.lat * (Math.PI / 180)) * sinB * sinB)
  )
  return R * c
}
