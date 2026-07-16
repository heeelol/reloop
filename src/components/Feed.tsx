import { useEffect, useMemo, useRef, useState } from 'react'
import type { Category, Item } from '../lib/types'
import { CATEGORIES, CATEGORY_EMOJI } from '../lib/impact'
import { distanceKm } from '../lib/geo'
import { hasSupabase } from '../lib/supabase'
import { searchItems } from '../lib/api'
import { getFavs, toggleFav } from '../lib/favorites'
import ItemCard from './ItemCard'

interface Props {
  items: Item[]
  userLoc: [number, number] | null
  selectedId: string | null
  loading?: boolean
  onSelect: (id: string) => void
  onClaim: (id: string) => void
  onCreateWant?: (query: string) => void
}

type SortKey = 'nearest' | 'newest' | 'impact'

// Minimal shape of the Web Speech API we use (not in the standard TS lib DOM).
interface SpeechRec {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: (e: {
    results: ArrayLike<ArrayLike<{ transcript: string }>>
  }) => void
  onend: () => void
  onerror: () => void
  start: () => void
  stop: () => void
}
type SpeechCtor = new () => SpeechRec
const SpeechRecognitionCtor: SpeechCtor | undefined =
  typeof window !== 'undefined'
    ? (window as unknown as {
        SpeechRecognition?: SpeechCtor
        webkitSpeechRecognition?: SpeechCtor
      }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechCtor })
        .webkitSpeechRecognition
    : undefined

export default function Feed({
  items,
  userLoc,
  selectedId,
  loading,
  onSelect,
  onClaim,
  onCreateWant,
}: Props) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<Category | 'All'>('All')
  const [sort, setSort] = useState<SortKey>(userLoc ? 'nearest' : 'newest')
  const [semantic, setSemantic] = useState<Item[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [favs, setFavs] = useState<Set<string>>(() => getFavs())
  const [showSaved, setShowSaved] = useState(false)
  const [alerted, setAlerted] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRec | null>(null)

  // Voice "search by need" — dictate the query, it flows into hybrid search.
  function toggleVoice() {
    if (!SpeechRecognitionCtor) return
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = new SpeechRecognitionCtor()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('')
      setQuery(text)
      setAlerted(false)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

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
    if (showSaved) list = list.filter((r) => favs.has(r.item.id))

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
  }, [items, semantic, usingSemantic, cat, query, sort, userLoc, showSaved, favs])

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2.5 border-b border-gray-100 p-3">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setAlerted(false)
            }}
            placeholder={
              listening
                ? 'Listening…'
                : hasSupabase
                  ? 'Search by need… “something to sit on”'
                  : 'Search give-aways nearby…'
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-16 text-sm outline-none focus:border-loop-400 focus:ring-2 focus:ring-loop-200"
          />
          {searching && (
            <span className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-loop-200 border-t-loop-600" />
          )}
          {SpeechRecognitionCtor && (
            <button
              onClick={toggleVoice}
              title={listening ? 'Stop listening' : 'Search by voice'}
              aria-label="Search by voice"
              className={`absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-sm transition ${
                listening
                  ? 'animate-pulse bg-red-500 text-white shadow'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-loop-600'
              }`}
            >
              🎤
            </button>
          )}
        </div>
        {usingSemantic && (
          <p
            title="Reciprocal Rank Fusion of pgvector cosine similarity + Postgres full-text search, ranked server-side"
            className="flex items-center gap-1 text-[11px] font-medium text-loop-600"
          >
            ⚡ Hybrid AI search · vector + keyword, fused for “{query.trim()}”
          </p>
        )}
        {onCreateWant && query.trim() !== '' && (
          <button
            onClick={() => {
              if (alerted) return
              onCreateWant(query.trim())
              setAlerted(true)
            }}
            className={`w-full rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              alerted
                ? 'border-loop-200 bg-loop-50 text-loop-700'
                : 'border-dashed border-loop-300 text-loop-700 hover:bg-loop-50'
            }`}
          >
            {alerted
              ? '✓ We’ll notify you when a match is posted nearby'
              : `🔔 Alert me when “${query.trim()}” is posted nearby`}
          </button>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <Chip active={cat === 'All' && !showSaved} onClick={() => { setCat('All'); setShowSaved(false) }}>
              All
            </Chip>
            <Chip active={showSaved} onClick={() => setShowSaved((v) => !v)}>
              ♥ Saved
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
        {loading &&
          shown.length === 0 &&
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse gap-3 rounded-xl border border-gray-100 p-2.5"
            >
              <div className="h-20 w-20 shrink-0 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-2/3 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
                <div className="h-3 w-1/3 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        {!loading && shown.length === 0 && (
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
            isFav={favs.has(item.id)}
            onToggleFav={() => setFavs(new Set(toggleFav(item.id)))}
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
