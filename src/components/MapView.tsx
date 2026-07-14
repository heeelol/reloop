import { useEffect, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'
import type { Item } from '../lib/types'
import { CATEGORY_EMOJI, formatCo2 } from '../lib/impact'
import { distanceKm, formatDistance } from '../lib/geo'

interface Props {
  items: Item[]
  center: [number, number]
  userLoc: [number, number] | null
  selectedId: string | null
  showHeat: boolean
  onSelect: (id: string) => void
  onOpenDetails?: (id: string) => void
}

function pinIcon(item: Item): L.DivIcon {
  const claimed = item.status === 'claimed'
  return L.divIcon({
    className: '',
    html: `<div class="loop-pin${claimed ? ' claimed' : ''}"><span>${
      CATEGORY_EMOJI[item.category]
    }</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  })
}

// Pans/zooms to the selected item.
function FlyToSelected({
  items,
  selectedId,
}: {
  items: Item[]
  selectedId: string | null
}) {
  const map = useMap()
  useEffect(() => {
    if (!selectedId) return
    const it = items.find((i) => i.id === selectedId)
    if (it) map.flyTo([it.lat, it.lng], Math.max(map.getZoom(), 15), { duration: 0.6 })
  }, [selectedId, items, map])
  return null
}

// Impact heatmap layer weighted by CO2 saved per available item.
function HeatLayer({ items, show }: { items: Item[]; show: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!show) return
    const points = items
      .filter((i) => i.status === 'available')
      .map((i) => [i.lat, i.lng, Math.min(1, i.co2Saved / 30)] as [number, number, number])
    // leaflet.heat augments L at runtime; it has no bundled types.
    const heat = (L as unknown as {
      heatLayer: (pts: [number, number, number][], opts: Record<string, unknown>) => L.Layer
    }).heatLayer
    const layer = heat(points, {
      radius: 45,
      blur: 30,
      maxZoom: 17,
      gradient: { 0.2: '#aaefca', 0.5: '#38c988', 0.8: '#078d59', 1: '#05714a' },
    })
    layer.addTo(map)
    return () => {
      layer.remove()
    }
  }, [items, show, map])
  return null
}

export default function MapView({
  items,
  center,
  userLoc,
  selectedId,
  showHeat,
  onSelect,
  onOpenDetails,
}: Props) {
  const markers = useMemo(
    () =>
      items.map((it) => {
        const dist = userLoc
          ? distanceKm(userLoc[0], userLoc[1], it.lat, it.lng)
          : null
        return (
          <Marker
            key={it.id}
            position={[it.lat, it.lng]}
            icon={pinIcon(it)}
            eventHandlers={{ click: () => onSelect(it.id) }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong>{it.title}</strong>
                <div style={{ fontSize: 12, color: '#555', margin: '2px 0' }}>
                  {it.category} · {formatCo2(it.co2Saved)} CO₂ saved
                </div>
                {dist !== null && (
                  <div style={{ fontSize: 12, color: '#078d59' }}>
                    {formatDistance(dist)}
                  </div>
                )}
                {it.status === 'claimed' && (
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Claimed</div>
                )}
                {onOpenDetails && (
                  <button
                    onClick={() => onOpenDetails(it.id)}
                    style={{
                      marginTop: 6,
                      background: '#14b06e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 999,
                      padding: '3px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    View details →
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        )
      }),
    [items, userLoc, onSelect, onOpenDetails],
  )

  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <HeatLayer items={items} show={showHeat} />
      <FlyToSelected items={items} selectedId={selectedId} />
      {userLoc && (
        <>
          <Circle
            center={userLoc}
            radius={220}
            pathOptions={{ color: '#14b06e', fillColor: '#14b06e', fillOpacity: 0.08, weight: 1 }}
          />
          <CircleMarker
            center={userLoc}
            radius={7}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#14b06e', fillOpacity: 1 }}
          />
        </>
      )}
      {markers}
    </MapContainer>
  )
}
