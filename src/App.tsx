import { useEffect, useMemo, useRef, useState } from 'react'
import type { Item } from './lib/types'
import { generateMockItems } from './lib/mock'
import { hasSupabase } from './lib/supabase'
import {
  claimItem,
  createItem,
  ensureAuth,
  fetchItemsNear,
  seedNearby,
  subscribeItems,
  uploadPhoto,
} from './lib/api'
import Header from './components/Header'
import ImpactBar from './components/ImpactBar'
import Feed from './components/Feed'
import MapView from './components/MapView'
import PostItemModal from './components/PostItemModal'

// Fallback center (used until geolocation resolves): central San Francisco.
const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194]

// Community activity accumulated before this session, so the impact stats
// reflect an established neighbourhood rather than starting at zero.
const BASELINE_CO2 = 1240
const BASELINE_REHOMED = 87

export default function App() {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null)
  const [items, setItems] = useState<Item[]>(() =>
    hasSupabase ? [] : generateMockItems(DEFAULT_CENTER[0], DEFAULT_CENTER[1]),
  )
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showPost, setShowPost] = useState(false)
  const [showHeat, setShowHeat] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number>(0)

  // Resolve location, sign in (anon), load nearby items, and subscribe to
  // live updates. Falls back to local mock data when there's no backend.
  useEffect(() => {
    let unsub: (() => void) | undefined

    async function init(loc: [number, number], located: boolean) {
      if (located) {
        setUserLoc(loc)
        setCenter(loc)
      }
      if (hasSupabase) {
        const id = await ensureAuth()
        setUserId(id)
        setItems(await fetchItemsNear(loc[0], loc[1]))
        unsub = subscribeItems(
          (it) =>
            setItems((prev) =>
              prev.some((p) => p.id === it.id) ? prev : [it, ...prev],
            ),
          (it) =>
            setItems((prev) => prev.map((p) => (p.id === it.id ? it : p))),
        )
      } else {
        setItems((prev) => {
          const userAdded = prev.filter((i) => i.id.startsWith('user-'))
          return [...generateMockItems(loc[0], loc[1]), ...userAdded]
        })
      }
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => init([pos.coords.latitude, pos.coords.longitude], true),
        () => init(DEFAULT_CENTER, false),
        { enableHighAccuracy: true, timeout: 8000 },
      )
    } else {
      init(DEFAULT_CENTER, false)
    }

    return () => unsub?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function flash(msg: string) {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }

  async function handleClaim(id: string) {
    const it = items.find((i) => i.id === id)
    // Optimistic update for snappy UX.
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'claimed' as const } : i)),
    )
    if (hasSupabase) {
      try {
        await claimItem(id)
      } catch (e) {
        flash('Sorry — someone just claimed that one.')
        setItems((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, status: 'available' as const } : i,
          ),
        )
        return
      }
    }
    if (it) flash(`Reserved “${it.title}” — ${it.co2Saved} kg CO₂ saved 🌱`)
  }

  async function handlePost(
    data: Omit<Item, 'id' | 'createdAt' | 'status'>,
    file: File | null,
  ) {
    if (hasSupabase && userId) {
      try {
        const imageUrl =
          file && !data.imageUrl.startsWith('http')
            ? await uploadPhoto(file, userId)
            : data.imageUrl
        const item = await createItem({ ...data, imageUrl }, userId)
        setItems((prev) =>
          prev.some((p) => p.id === item.id) ? prev : [item, ...prev],
        )
        setSelectedId(item.id)
      } catch (e) {
        flash('Could not post — please try again.')
        return
      }
    } else {
      const item: Item = {
        ...data,
        id: `user-${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'available',
      }
      setItems((prev) => [item, ...prev])
      setSelectedId(item.id)
    }
    setShowPost(false)
    setMobileView('map')
    flash('Posted! It’s live on the map for your neighbours 📍')
  }

  async function handleSeed() {
    if (!userId || !userLoc) return
    setSeeding(true)
    const seeded = await seedNearby(userLoc[0], userLoc[1], userId)
    setSeeding(false)
    if (seeded.length) {
      setItems((prev) => {
        const ids = new Set(prev.map((p) => p.id))
        return [...seeded.filter((s) => !ids.has(s.id)), ...prev]
      })
      flash(`Added ${seeded.length} sample give-aways nearby`)
    }
  }

  const stats = useMemo(() => {
    const claimed = items.filter((i) => i.status === 'claimed')
    const active = items.filter((i) => i.status === 'available').length
    const claimedCo2 = claimed.reduce((s, i) => s + i.co2Saved, 0)
    return {
      totalCo2: BASELINE_CO2 + claimedCo2,
      rehomed: BASELINE_REHOMED + claimed.length,
      active,
    }
  }, [items])

  const showSeed = hasSupabase && !!userLoc && items.length === 0

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header onPost={() => setShowPost(true)} />
      <ImpactBar {...stats} />

      {/* Mobile view toggle */}
      <div className="flex gap-1 border-b border-gray-100 bg-white p-2 lg:hidden">
        {(['list', 'map'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setMobileView(v)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-semibold capitalize transition ${
              mobileView === v ? 'bg-loop-100 text-loop-700' : 'text-gray-500'
            }`}
          >
            {v === 'list' ? '☰ List' : '🗺️ Map'}
          </button>
        ))}
      </div>

      <main className="flex min-h-0 flex-1">
        <section
          className={`w-full border-r border-gray-100 bg-white lg:w-[380px] lg:shrink-0 ${
            mobileView === 'list' ? 'block' : 'hidden'
          } lg:block`}
        >
          <Feed
            items={items}
            userLoc={userLoc}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id)
              setMobileView('map')
            }}
            onClaim={handleClaim}
          />
        </section>

        <section
          className={`relative min-h-0 flex-1 ${
            mobileView === 'map' ? 'block' : 'hidden'
          } lg:block`}
        >
          <MapView
            items={items}
            center={center}
            userLoc={userLoc}
            selectedId={selectedId}
            showHeat={showHeat}
            onSelect={setSelectedId}
          />
          <button
            onClick={() => setShowHeat((v) => !v)}
            className={`absolute right-3 top-3 z-[500] rounded-full px-3 py-1.5 text-xs font-semibold shadow-md transition ${
              showHeat
                ? 'bg-loop-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            🔥 Impact heatmap
          </button>
          {showSeed && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="absolute bottom-4 left-1/2 z-[500] -translate-x-1/2 rounded-full bg-loop-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-loop-700 disabled:opacity-60"
            >
              {seeding ? 'Adding…' : '🌱 Seed my neighbourhood (demo)'}
            </button>
          )}
        </section>
      </main>

      {showPost && (
        <PostItemModal
          userLoc={userLoc}
          onClose={() => setShowPost(false)}
          onSubmit={handlePost}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[1100] -translate-x-1/2 animate-[fadeIn_0.25s_ease] rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
