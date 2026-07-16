import type { ReactNode } from 'react'
import { Recycle, Trophy } from 'lucide-react'

interface Props {
  onPost: () => void
  name?: string
  onEditProfile?: () => void
  onLeaderboard?: () => void
  bell?: ReactNode
}

export default function Header({
  onPost,
  name,
  onEditProfile,
  onLeaderboard,
  bell,
}: Props) {
  return (
    <header className="flex items-center justify-between border-b border-loop-100 bg-white px-4 py-3 shadow-sm sm:px-6">
      <div className="flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-loop-500 text-white shadow-sm">
          <Recycle size={20} strokeWidth={2.4} />
        </div>
        <div className="leading-tight">
          <h1 className="text-lg font-bold tracking-tight text-loop-800">
            ReLoop
          </h1>
          <p className="hidden text-xs text-gray-500 sm:block">
            Give it away, keep it local, keep it out of landfill
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onLeaderboard && (
          <button
            onClick={onLeaderboard}
            title="Leaderboard"
            className="hidden h-9 w-9 place-items-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 sm:grid"
          >
            <Trophy size={17} />
          </button>
        )}
        {bell}
        {onEditProfile && (
          <button
            onClick={onEditProfile}
            title="Edit your name"
            className="flex items-center gap-1.5 rounded-full border border-gray-200 py-1.5 pl-1.5 pr-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-loop-100 text-xs font-bold text-loop-700">
              {name ? name.charAt(0).toUpperCase() : '?'}
            </span>
            <span className="hidden max-w-[100px] truncate sm:inline">
              {name || 'Set name'}
            </span>
          </button>
        )}
        <button
          onClick={onPost}
          className="rounded-full bg-loop-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-loop-600 active:scale-95"
        >
          + Give away
        </button>
      </div>
    </header>
  )
}
