interface Props {
  onPost: () => void
}

export default function Header({ onPost }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-loop-100 bg-white px-4 py-3 shadow-sm sm:px-6">
      <div className="flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-loop-500 text-lg text-white shadow-sm">
          ♻️
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
      <button
        onClick={onPost}
        className="rounded-full bg-loop-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-loop-600 active:scale-95"
      >
        + Give away
      </button>
    </header>
  )
}
