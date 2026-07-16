// Real street-level route between two points, via the public OSRM server.
// Used to draw the pickup path from the user to a selected give-away. If the
// service is unavailable we fall back to a straight line so the map still shows
// a connection.

export interface RouteResult {
  coords: [number, number][] // [lat, lng] pairs, ready for Leaflet
  distanceM: number
  durationS: number
}

export async function fetchRoute(
  from: [number, number],
  to: [number, number],
): Promise<RouteResult | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}` +
    `?overview=full&geometries=geojson`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const r = json?.routes?.[0]
    if (!r?.geometry?.coordinates) return null
    return {
      coords: (r.geometry.coordinates as [number, number][]).map(
        ([lng, lat]) => [lat, lng] as [number, number],
      ),
      distanceM: r.distance,
      durationS: r.duration,
    }
  } catch {
    return null
  }
}
