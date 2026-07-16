import { useMemo } from 'react'
import {
  Sprout,
  Recycle,
  Handshake,
  Globe,
  Award,
  CircleCheck,
  type LucideIcon,
} from 'lucide-react'
import type { Item } from '../lib/types'
import { formatCo2 } from '../lib/impact'
import { CATEGORY_ICON } from '../lib/icons'
import { timeAgo } from '../lib/time'

interface Props {
  items: Item[]
  userId: string | null
  onRelease: (id: string) => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

function Row({
  item,
  onSelect,
  action,
}: {
  item: Item
  onSelect: () => void
  action: React.ReactNode
}) {
  const CatIcon = CATEGORY_ICON[item.category]
  return (
    <div className="flex gap-3 rounded-xl border border-gray-100 bg-white p-2.5">
      <button onClick={onSelect} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        <img
          src={item.imageUrl}
          alt={item.title}
          className={`h-full w-full object-cover ${item.status === 'claimed' ? 'grayscale' : ''}`}
        />
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="truncate text-sm font-semibold text-gray-900">{item.title}</h3>
        <span className="flex items-center gap-1 text-[11px] text-gray-500">
          <CatIcon size={12} className="shrink-0" /> {item.category} ·{' '}
          {formatCo2(item.co2Saved)} CO₂ · {timeAgo(item.createdAt)}
        </span>
        <div className="mt-auto pt-1.5">{action}</div>
      </div>
    </div>
  )
}

export default function MyItems({ items, userId, onRelease, onDelete, onSelect }: Props) {
  const { posted, reserved, impactCo2, rehomed, badges } = useMemo(() => {
    const posted = items.filter((i) => i.ownerId && i.ownerId === userId)
    const reserved = items.filter(
      (i) => i.claimedById && i.claimedById === userId && i.ownerId !== userId,
    )
    const given = posted.filter((i) => i.status === 'claimed')
    const impactCo2 =
      given.reduce((s, i) => s + i.co2Saved, 0) +
      reserved.reduce((s, i) => s + i.co2Saved, 0)
    const rehomed = given.length + reserved.length
    const badges: { Icon: LucideIcon; label: string }[] = []
    if (posted.length >= 1) badges.push({ Icon: Sprout, label: 'First give' })
    if (given.length >= 3) badges.push({ Icon: Recycle, label: 'Serial giver' })
    if (reserved.length >= 1) badges.push({ Icon: Handshake, label: 'Rescuer' })
    if (impactCo2 >= 50) badges.push({ Icon: Globe, label: 'Eco hero' })
    if (rehomed >= 10) badges.push({ Icon: Award, label: 'Loop legend' })
    return { posted, reserved, impactCo2, rehomed, badges }
  }, [items, userId])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 p-3">
        <div className="rounded-xl bg-loop-50 p-3">
          <div className="text-2xl font-extrabold text-loop-700">
            {formatCo2(impactCo2)} CO₂
          </div>
          <div className="text-xs text-gray-600">
            your impact · {rehomed} item{rehomed === 1 ? '' : 's'} kept in the loop
          </div>
          {badges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-loop-700 shadow-sm"
                >
                  <b.Icon size={12} strokeWidth={2.4} /> {b.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {posted.length === 0 && reserved.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400">
            Nothing yet — post something you no longer need, or reserve a nearby give-away.
          </p>
        )}

        {posted.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400">
              You're giving away
            </h4>
            {posted.map((item) => (
              <Row
                key={item.id}
                item={item}
                onSelect={() => onSelect(item.id)}
                action={
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={
                        item.status === 'claimed'
                          ? 'flex items-center gap-1 font-semibold text-loop-600'
                          : 'text-gray-400'
                      }
                    >
                      {item.status === 'claimed' ? (
                        <>
                          <CircleCheck size={13} /> Reserved by a neighbour
                        </>
                      ) : (
                        'Available'
                      )}
                    </span>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="rounded-full border border-gray-200 px-2.5 py-1 font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Remove
                    </button>
                  </div>
                }
              />
            ))}
          </section>
        )}

        {reserved.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400">
              You reserved
            </h4>
            {reserved.map((item) => (
              <Row
                key={item.id}
                item={item}
                onSelect={() => onSelect(item.id)}
                action={
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">from {item.ownerName}</span>
                    <button
                      onClick={() => onRelease(item.id)}
                      className="rounded-full border border-gray-200 px-2.5 py-1 font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Release
                    </button>
                  </div>
                }
              />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
