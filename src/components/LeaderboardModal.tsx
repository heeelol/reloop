import { useEffect, useState } from 'react'
import type { LeaderRow } from '../lib/types'
import { fetchLeaderboard } from '../lib/api'
import { formatCo2 } from '../lib/impact'

interface Props {
  open: boolean
  onClose: () => void
}

export default function LeaderboardModal({ open, onClose }: Props) {
  const [rows, setRows] = useState<LeaderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetchLeaderboard(10).then((r) => {
      setRows(r)
      setLoading(false)
    })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const medal = (i: number) =>
    i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-loop-800">🏆 Top givers nearby</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-500">Ranked by CO₂ kept out of landfill.</p>
        {loading && <p className="py-8 text-center text-sm text-gray-400">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No give-aways yet.</p>
        )}
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div
              key={r.ownerName + i}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                i < 3 ? 'bg-loop-50' : 'bg-gray-50'
              }`}
            >
              <span className="w-6 text-center text-lg font-bold">{medal(i)}</span>
              <span className="flex-1 truncate text-sm font-semibold text-gray-800">
                {r.ownerName}
              </span>
              <span className="text-xs text-gray-500">{r.given} items</span>
              <span className="text-sm font-bold text-loop-700">{formatCo2(r.co2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
