import { useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { X, Navigation } from 'lucide-react'
import type { Item } from '../lib/types'
import { co2Equivalent, formatCo2 } from '../lib/impact'
import { CATEGORY_ICON, CATEGORY_PIN_SVG } from '../lib/icons'
import { distanceKm, formatDistance } from '../lib/geo'
import { fetchRoute, type RouteResult } from '../lib/route'
import { timeAgo } from '../lib/time'

import ChatPanel from './ChatPanel'

interface Props {
  item: Item | null
  userLoc: [number, number] | null
  userId?: string | null
  onClose: () => void
  onClaim: (id: string) => void
}

function pin(item: Item) {
  return L.divIcon({
    className: '',
    html: `<div class="loop-pin"><span>${CATEGORY_PIN_SVG[item.category]}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  })
}

// Fit the mini-map to show the whole pickup route (you → item).
function FitRoute({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length >= 2)
      map.fitBounds(L.latLngBounds(coords), { padding: [24, 24] })
  }, [coords, map])
  return null
}

function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.round((distanceM / 1000 / 4.8) * 60))
}

export default function ItemDrawer({
  item,
  userLoc,
  userId,
  onClose,
  onClaim,
}: Props) {
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [loadingRoute, setLoadingRoute] = useState(false)
  const itemId = item?.id
  const lat = item?.lat
  const lng = item?.lng
  const uLat = userLoc?.[0]
  const uLng = userLoc?.[1]

  // Fetch real turn-by-turn directions from the user to this give-away.
  useEffect(() => {
    if (lat == null || lng == null || uLat == null || uLng == null) {
      setRoute(null)
      return
    }
    let cancelled = false
    setLoadingRoute(true)
    fetchRoute([uLat, uLng], [lat, lng]).then((r) => {
      if (!cancelled) {
        setRoute(r)
        setLoadingRoute(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [itemId, lat, lng, uLat, uLng])

  if (!item) return null
  const CatIcon = CATEGORY_ICON[item.category]
  const eq = co2Equivalent(item.co2Saved)
  const claimed = item.status === 'claimed'
  const isOwner = !!userId && item.ownerId === userId
  const isClaimer = !!userId && item.claimedById === userId
  const canChat = claimed && (isOwner || isClaimer)
  const dist =
    userLoc && distanceKm(userLoc[0], userLoc[1], item.lat, item.lng)
  const walkMin = dist != null ? Math.max(1, Math.round((dist / 4.8) * 60)) : null

  async function share() {
    const text = `${item!.title} — free on ReLoop`
    const url = 'https://reloop-six-beta.vercel.app'
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ReLoop', text, url })
      } catch {
        /* dismissed */
      }
    } else {
      navigator.clipboard?.writeText(`${text} ${url}`)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md animate-[slideIn_0.25s_ease] flex-col overflow-hidden bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-64 shrink-0 bg-gray-100">
          <img
            src={item.imageUrl}
            alt={item.title}
            className={`h-full w-full object-cover ${claimed ? 'grayscale' : ''}`}
          />
          <button
            onClick={onClose}
            className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-white"
          >
            <X size={18} />
          </button>
          <span className="absolute right-3 top-3 rounded-full bg-loop-600 px-3 py-1 text-sm font-bold text-white shadow">
            saves {formatCo2(item.co2Saved)} CO₂
          </span>
          {claimed && (
            <div className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-semibold uppercase tracking-wide text-white">
              Claimed
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{item.title}</h2>
            <p className="flex items-center gap-1 text-sm text-gray-500">
              <CatIcon size={14} className="shrink-0" /> {item.category} · posted
              by {item.ownerName} · {timeAgo(item.createdAt)}
            </p>
          </div>

          <p className="text-sm leading-relaxed text-gray-700">
            {item.description}
          </p>

          <div className="flex items-center gap-4 rounded-xl bg-loop-50 p-3 text-sm">
            <div className="flex flex-col">
              <span className="font-bold text-loop-700">
                {dist != null ? formatDistance(dist) : item.locationName}
              </span>
              {walkMin != null && (
                <span className="text-xs text-loop-600">
                  ~{walkMin} min walk · {eq.text}
                </span>
              )}
            </div>
          </div>

          <div className="h-44 overflow-hidden rounded-xl border border-gray-100">
            <MapContainer
              center={[item.lat, item.lng]}
              zoom={15}
              scrollWheelZoom={false}
              dragging={false}
              zoomControl={false}
              doubleClickZoom={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                attribution="&copy; CARTO"
              />
              <Marker position={[item.lat, item.lng]} icon={pin(item)} />
              {userLoc && (
                <CircleMarker
                  center={userLoc}
                  radius={6}
                  pathOptions={{
                    color: '#fff',
                    weight: 2,
                    fillColor: '#14b06e',
                    fillOpacity: 1,
                  }}
                />
              )}
              {route && route.coords.length >= 2 && (
                <>
                  <Polyline
                    positions={route.coords}
                    pathOptions={{
                      color: '#078d59',
                      weight: 4,
                      opacity: 0.85,
                      lineCap: 'round',
                      dashArray: '2 9',
                    }}
                  />
                  <FitRoute coords={route.coords} />
                </>
              )}
            </MapContainer>
          </div>

          {userLoc && (
            <div className="rounded-xl border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-loop-700">
                  <Navigation size={13} /> Directions to pickup
                </span>
                {route && (
                  <span className="text-[11px] font-medium text-gray-500">
                    {formatDistance(route.distanceM / 1000)} · ~
                    {walkMinutes(route.distanceM)} min walk
                  </span>
                )}
              </div>
              <div className="max-h-44 overflow-y-auto p-2">
                {loadingRoute && (
                  <p className="p-2 text-center text-xs text-gray-400">
                    Finding the best way there…
                  </p>
                )}
                {!loadingRoute && !route && (
                  <p className="p-2 text-center text-xs text-gray-400">
                    {dist != null ? formatDistance(dist) : ''} toward{' '}
                    {item.locationName} — routing unavailable right now.
                  </p>
                )}
                {!loadingRoute && route && (
                  <ol className="space-y-0.5">
                    {route.steps.map((s, i) => (
                      <li
                        key={i}
                        className="flex gap-2 rounded-lg px-2 py-1 text-xs text-gray-700"
                      >
                        <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-loop-100 text-[9px] font-bold text-loop-700">
                          {i + 1}
                        </span>
                        <span className="flex-1">
                          {s.instruction}
                          {s.distanceM > 20 && (
                            <span className="text-gray-400">
                              {' · '}
                              {formatDistance(s.distanceM / 1000)}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}

          {canChat && <ChatPanel itemId={item.id} userId={userId ?? null} />}
        </div>

        <div className="flex gap-2 border-t border-gray-100 p-4">
          <button
            onClick={share}
            className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Share
          </button>
          <button
            disabled={claimed || isOwner}
            onClick={() => {
              onClaim(item.id)
              onClose()
            }}
            className="flex-1 rounded-full bg-loop-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-loop-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isOwner
              ? 'This is your listing'
              : claimed
                ? 'Reserved'
                : 'Reserve & arrange pickup'}
          </button>
        </div>
      </div>
    </div>
  )
}
