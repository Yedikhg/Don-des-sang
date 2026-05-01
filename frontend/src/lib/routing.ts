/** Driving route as [lat, lng][] for Leaflet. */
export type RouteLatLng = [number, number]

/**
 * Fetches a road-following route (OSRM public demo).
 * Falls back to caller using a straight segment if this throws or CORS/network fails.
 */
export async function fetchOsrmDrivingRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RouteLatLng[]> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)

  const data = (await res.json()) as {
    routes?: Array<{ geometry?: { type?: string; coordinates?: number[][] } }>
  }

  const coords = data?.routes?.[0]?.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) throw new Error('OSRM: empty geometry')

  return coords.map((c) => {
    const lng = c[0]
    const lat = c[1]
    return [lat, lng] as RouteLatLng
  })
}

export function straightLineRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): RouteLatLng[] {
  return [
    [from.lat, from.lng],
    [to.lat, to.lng],
  ]
}
