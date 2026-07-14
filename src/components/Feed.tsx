import { useEffect, useMemo, useState } from 'react'
import type { Category, Item } from '../lib/types'
import { CATEGORIES, CATEGORY_EMOJI } from '../lib/impact'
import { distanceKm } from '../lib/geo'
import { hasSupabase } from '../lib/supabase'
import { searchItems } from '../lib/api'
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
  const [semantic, setSemantic] = useState<Item[] | null>(null)
  const [searching, setSearching] = useState(false)

  // Semantic "search by need" — embed the query and match items by meaning.
  // Falls back to the local keyword filter if there's no backend / it fails.
  useEffect(() => {
    if (!hasSupabase || !query.trim()) {
      setSemantic(null)
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const t = window.setTimeout(async () => {
      const r = await searchItems(
        query,
        userLoc?.[0] ?? null,
        userLoc?.[1] ?? null,
      )
      if (!cancelled) {
        setSemantic(r)
        setSearching(false)
      }
    }, 350)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [query, userLoc])

  const usingSemantic = hasSupabase && query.trim() !== '' && semantic !== null

  const shown = useMemo(() => {
    const source = usingSemantic ? (semantic as Item[]) : items
    let list = source.map((it) => ({
      item: it,
      dist: userLoc ? distanceKm(userLoc[0], userLoc[1], it.lat, it.lng) : null,
    }))
    if (cat !== 'All') list = list.filter((r) => r.item.category === cat)

    // Semantic results arrive pre-ranked by relevance — preserve that order.
    if (usingSemantic) return list

    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (r) =>
          r.item.title.toLowerCase().includes(q) ||
          r.item.description.toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => {
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
  }, [items, semantic, usingSemantic, cat, query, sort, userLoc])

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2.5 border-b border-gray-100 p-3">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              hasSupabase
                ? 'Search by need… “something to sit on”'
                : 'Search give-aways nearby…'
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-9 text-sm outline-none focus:border-loop-400 focus:ring-2 focus:ring-loop-200"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-loop-200 border-t-loop-600" />
          )}
        </div>
        {usingSemantic && (
          <p className="flex items-center gap-1 text-[11px] font-medium text-loop-600">
            ✨ AI-ranked by relevance to “{query.trim()}”
          </p>
        )}
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
        {!usingSemantic && (
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
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {shown.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400">
            {query.trim()
              ? 'No matches — try describing it differently.'
              : 'Nothing here yet — be the first to give something away.'}
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
