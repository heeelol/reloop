import type { Item } from '../lib/types'
import { CATEGORY_EMOJI, formatCo2 } from '../lib/impact'
import { formatDistance } from '../lib/geo'
import { timeAgo } from '../lib/time'

interface Props {
  item: Item
  distanceKm: number | null
  selected: boolean
  isFav?: boolean
  onToggleFav?: () => void
  onSelect: () => void
  onClaim: () => void
}

export default function ItemCard({
  item,
  distanceKm,
  selected,
  isFav,
  onToggleFav,
  onSelect,
  onClaim,
}: Props) {
  const claimed = item.status === 'claimed'
  return (
    <div
      onClick={onSelect}
      className={`group flex cursor-pointer gap-3 rounded-xl border p-2.5 transition ${
        selected
          ? 'border-loop-400 bg-loop-50 ring-2 ring-loop-300'
          : 'border-gray-100 bg-white hover:border-loop-200 hover:shadow-sm'
      }`}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        <img
          src={item.imageUrl}
          alt={item.title}
          loading="lazy"
          className={`h-full w-full object-cover transition group-hover:scale-105 ${
            claimed ? 'grayscale' : ''
          }`}
        />
        {claimed && (
          <div className="absolute inset-0 grid place-items-center bg-black/45 text-[11px] font-semibold uppercase tracking-wide text-white">
            Claimed
          </div>
        )}
        {onToggleFav && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFav()
            }}
            title={isFav ? 'Remove from saved' : 'Save'}
            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/85 text-xs shadow-sm backdrop-blur transition hover:bg-white"
          >
            {isFav ? '❤️' : '🤍'}
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {item.title}
          </h3>
          <span className="shrink-0 rounded-full bg-loop-100 px-2 py-0.5 text-[11px] font-semibold text-loop-700">
            {formatCo2(item.co2Saved)} CO₂
          </span>
        </div>
        <p className="line-clamp-2 text-xs text-gray-500">{item.description}</p>
        <div className="mt-auto flex items-center justify-between pt-1.5 text-[11px] text-gray-500">
          <span>
            {CATEGORY_EMOJI[item.category]} {item.category}
            {distanceKm !== null && <> · {formatDistance(distanceKm)}</>}
            {' · '}
            {timeAgo(item.createdAt)}
          </span>
          {!claimed && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClaim()
              }}
              className="rounded-full bg-loop-500 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-loop-600 active:scale-95"
            >
              Claim
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
