const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

if (!mapboxToken) {
  throw new Error(
    'Missing required environment variable VITE_MAPBOX_TOKEN. Add it to client/.env.local.',
  )
}

export const MAPBOX_TOKEN = mapboxToken
