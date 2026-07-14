import { useMemo, useState } from 'react'
import type { Category, Item } from '../lib/types'
import { CATEGORIES, CATEGORY_EMOJI } from '../lib/impact'
import { distanceKm } from '../lib/geo'
import ItemCard from './ItemCard'

interface Props {
  items: Item[]
  userLoc: [number, number] | null
  selectedId: string | null
  onSelect: (id: string) => void
  onClaim: (id: string) => void
}

type SortKey = 'nearest' | 'newest' | 'impact'

export default function Feed({
  items,
  userLoc,
  selectedId,
  onSelect,
  onClaim,
}: Props) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<Category | 'All'>('All')
  const [sort, setSort] = useState<SortKey>(userLoc ? 'nearest' : 'newest')

  const withDist = useMemo(
    () =>
      items.map((it) => ({
        item: it,
        dist: userLoc
          ? distanceKm(userLoc[0], userLoc[1], it.lat, it.lng)
          : null,
      })),
    [items, userLoc],
  )

  const shown = useMemo(() => {
    let list = withDist
    if (cat !== 'All') list = list.filter((r) => r.item.category === cat)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (r) =>
          r.item.title.toLowerCase().includes(q) ||
          r.item.description.toLowerCase().includes(q),
      )
    }
    const sorted = [...list].sort((a, b) => {
      // Available first, then by chosen sort.
      const av = a.item.status === 'available' ? 0 : 1
      const bv = b.item.status === 'available' ? 0 : 1
      if (av !== bv) return av - bv
      if (sort === 'nearest' && a.dist !== null && b.dist !== null)
        return a.dist - b.dist
      if (sort === 'impact') return b.item.co2Saved - a.item.co2Saved
      return (
        new Date(b.item.createdAt).getTime() -
        new Date(a.item.createdAt).getTime()
      )
    })
    return sorted
  }, [withDist, cat, query, sort])

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2.5 border-b border-gray-100 p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search give-aways nearby…"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-loop-400 focus:ring-2 focus:ring-loop-200"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <Chip active={cat === 'All'} onClick={() => setCat('All')}>
              All
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                {CATEGORY_EMOJI[c]} {c}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 text-xs">
          {(['nearest', 'newest', 'impact'] as SortKey[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              disabled={s === 'nearest' && !userLoc}
              className={`rounded-full px-2.5 py-1 font-medium capitalize transition disabled:opacity-40 ${
                sort === s
                  ? 'bg-loop-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {shown.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400">
            Nothing here yet — be the first to give something away.
          </p>
        )}
        {shown.map(({ item, dist }) => (
          <ItemCard
            key={item.id}
            item={item}
            distanceKm={dist}
            selected={item.id === selectedId}
            onSelect={() => onSelect(item.id)}
            onClaim={() => onClaim(item.id)}
          />
        ))}
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition ${
        active
          ? 'bg-loop-500 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}
