import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'
import type { Item } from '../lib/types'
import { CATEGORY_EMOJI, formatCo2 } from '../lib/impact'
import { distanceKm, formatDistance } from '../lib/geo'
import { fetchRoute } from '../lib/route'

interface Props {
  items: Item[]
  center: [number, number]
  userLoc: [number, number] | null
  selectedId: string | null
  showHeat: boolean
  radiusM?: number
  recentIds?: Set<string>
  onSelect: (id: string) => void
  onOpenDetails?: (id: string) => void
}

function pinIcon(item: Item, isNew: boolean): L.DivIcon {
  const claimed = item.status === 'claimed'
  return L.divIcon({
    className: '',
    html: `<div class="loop-pin${claimed ? ' claimed' : ''}${
      isNew ? ' drop' : ''
    }"><span>${CATEGORY_EMOJI[item.category]}</span></div>`,
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
  // Keep the latest items without making them a trigger — otherwise every data
  // update (realtime, claim) re-fires flyTo and the map feels jumpy/unresponsive.
  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(() => {
    if (!selectedId) return
    const it = itemsRef.current.find((i) => i.id === selectedId)
    if (it) map.flyTo([it.lat, it.lng], Math.max(map.getZoom(), 15), { duration: 0.6 })
  }, [selectedId, map])
  return null
}

// Draws a real street route from the user to the selected give-away.
// Falls back to a straight line if the routing service is unreachable.
function RouteLine({
  from,
  to,
}: {
  from: [number, number] | null
  to: [number, number] | null
}) {
  const [coords, setCoords] = useState<[number, number][]>([])
  const lineRef = useRef<L.Polyline | null>(null)
  const fromKey = from ? `${from[0]},${from[1]}` : ''
  const toKey = to ? `${to[0]},${to[1]}` : ''
  useEffect(() => {
    if (!from || !to) {
      setCoords([])
      return
    }
    let cancelled = false
    fetchRoute(from, to).then((r) => {
      if (!cancelled) setCoords(r?.coords ?? [from, to])
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKey, toKey])

  // react-leaflet v5 drops pathOptions.className, so add the animated-dash class
  // straight onto the SVG element after the layer has rendered its path.
  useEffect(() => {
    lineRef.current?.getElement()?.classList.add('pickup-route')
  }, [coords])

  if (coords.length < 2) return null
  return (
    <Polyline
      ref={lineRef}
      positions={coords}
      pathOptions={{
        color: '#078d59',
        weight: 4,
        opacity: 0.85,
        lineCap: 'round',
        dashArray: '2 10',
      }}
    />
  )
}

// Impact heatmap layer weighted by CO2 saved per available item.
function HeatLayer({ items, show }: { items: Item[]; show: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!show) return
    // leaflet.heat augments L at runtime; it has no bundled types. Guard in case
    // the plugin didn't attach (older bundlers / non-Chromium engines).
    const heat = (
      L as unknown as {
        heatLayer?: (
          pts: [number, number, number][],
          opts: Record<string, unknown>,
        ) => L.Layer
      }
    ).heatLayer
    if (typeof heat !== 'function') return
    const points = items
      .filter((i) => i.status === 'available')
      .map(
        (i) =>
          [i.lat, i.lng, Math.min(1, i.co2Saved / 30)] as [
            number,
            number,
            number,
          ],
      )
    let layer: L.Layer | null = null
    try {
      layer = heat(points, {
        radius: 45,
        blur: 30,
        maxZoom: 17,
        gradient: { 0.2: '#aaefca', 0.5: '#38c988', 0.8: '#078d59', 1: '#05714a' },
      })
      layer.addTo(map)
    } catch (e) {
      console.warn('heatmap failed:', e)
    }
    return () => {
      try {
        layer?.remove()
      } catch {
        /* ignore */
      }
    }
  }, [items, show, map])
  return null
}

function MapView({
  items,
  center,
  userLoc,
  selectedId,
  showHeat,
  radiusM,
  recentIds,
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
            icon={pinIcon(it, recentIds?.has(it.id) ?? false)}
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
    [items, userLoc, onSelect, onOpenDetails, recentIds],
  )

  // Coordinates of the selected item (for the pickup route line).
  const selectedTo = useMemo(() => {
    const it = items.find((i) => i.id === selectedId)
    return it ? ([it.lat, it.lng] as [number, number]) : null
  }, [items, selectedId])

  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
        updateWhenIdle
        updateWhenZooming={false}
        keepBuffer={2}
      />
      <HeatLayer items={items} show={showHeat} />
      <FlyToSelected items={items} selectedId={selectedId} />
      <RouteLine from={userLoc} to={selectedTo} />
      {userLoc && (
        <>
          <Circle
            center={userLoc}
            radius={radiusM ?? 220}
            pathOptions={{ color: '#14b06e', fillColor: '#14b06e', fillOpacity: 0.06, weight: 1 }}
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

export default memo(MapView)
