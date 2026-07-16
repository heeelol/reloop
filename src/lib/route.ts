// Real street-level route between two points, via the public OSRM server.
// Used to draw the pickup path from the user to a selected give-away and to
// list turn-by-turn directions. If the service is unavailable we fall back to a
// straight line so the map still shows a connection.

export interface RouteStep {
  instruction: string
  distanceM: number
}

export interface RouteResult {
  coords: [number, number][] // [lat, lng] pairs, ready for Leaflet
  distanceM: number
  durationS: number
  steps: RouteStep[]
}

interface OsrmManeuver {
  type: string
  modifier?: string
  bearing_after?: number
}
interface OsrmStep {
  distance: number
  name?: string
  maneuver: OsrmManeuver
}
interface OsrmLeg {
  steps: OsrmStep[]
}
interface OsrmRoute {
  distance: number
  duration: number
  geometry: { coordinates: [number, number][] }
  legs: OsrmLeg[]
}

const COMPASS = [
  'north',
  'north-east',
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
]

function compass(bearing: number): string {
  return COMPASS[Math.round(bearing / 45) % 8]
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Build a friendly instruction from an OSRM maneuver.
function describe(step: OsrmStep): string {
  const m = step.maneuver
  const road = step.name && step.name.trim() ? step.name : null
  const onto = road ? ` onto ${road}` : ''
  const on = road ? ` on ${road}` : ''
  const dir = m.modifier ? ` ${m.modifier}` : ''
  switch (m.type) {
    case 'depart':
      return `Head ${compass(m.bearing_after ?? 0)}${on}`
    case 'arrive':
      return 'Arrive at the pickup spot'
    case 'turn':
      return `Turn${dir}${onto}`
    case 'continue':
      return `Continue${dir}${on}`
    case 'new name':
      return `Continue${on}`
    case 'merge':
      return `Merge${dir}${onto}`
    case 'on ramp':
      return `Take the ramp${dir}${onto}`
    case 'off ramp':
      return `Take the exit${dir}${onto}`
    case 'fork':
      return `Keep${dir} at the fork${onto}`
    case 'end of road':
      return `At the end of the road, turn${dir}${onto}`
    case 'roundabout':
    case 'rotary':
      return `Take the roundabout${onto}`
    default:
      return `${cap(m.type || 'continue')}${dir}${on}`
  }
}

export async function fetchRoute(
  from: [number, number],
  to: [number, number],
): Promise<RouteResult | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}` +
    `?overview=full&geometries=geojson&steps=true`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const r = (json?.routes as OsrmRoute[] | undefined)?.[0]
    if (!r?.geometry?.coordinates) return null
    const steps = (r.legs ?? [])
      .flatMap((leg) => leg.steps ?? [])
      .map((s) => ({ instruction: describe(s), distanceM: s.distance }))
      // Drop zero-length connector steps so the list stays readable.
      .filter((s, i, arr) => s.distanceM > 5 || i === arr.length - 1)
    return {
      coords: r.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng] as [number, number],
      ),
      distanceM: r.distance,
      durationS: r.duration,
      steps,
    }
  } catch {
    return null
  }
}
