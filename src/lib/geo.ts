// Haversine distance in km between two lat/lng points.
export function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`
  return `${km.toFixed(1)} km away`
}

// Deterministic small offset (in degrees) for scattering points near a center.
export function offsetMeters(
  lat: number,
  lng: number,
  north: number,
  east: number,
): { lat: number; lng: number } {
  const dLat = north / 111_320
  const dLng = east / (111_320 * Math.cos(toRad(lat)))
  return { lat: lat + dLat, lng: lng + dLng }
}
