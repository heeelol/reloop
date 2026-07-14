import { MapContainer, TileLayer, Marker, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import type { Item } from '../lib/types'
import { CATEGORY_EMOJI, co2Equivalent, formatCo2 } from '../lib/impact'
import { distanceKm, formatDistance } from '../lib/geo'
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
    html: `<div class="loop-pin"><span>${CATEGORY_EMOJI[item.category]}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  })
}

export default function ItemDrawer({
  item,
  userLoc,
  userId,
  onClose,
  onClaim,
}: Props) {
  if (!item) return null
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
            ✕
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
            <p className="text-sm text-gray-500">
              {CATEGORY_EMOJI[item.category]} {item.category} · posted by{' '}
              {item.ownerName} · {timeAgo(item.createdAt)}
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
                  ~{walkMin} min walk · {co2Equivalent(item.co2Saved)}
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
            </MapContainer>
          </div>

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
