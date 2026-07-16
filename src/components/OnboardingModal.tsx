import { useEffect, useState } from 'react'
import { Recycle, Camera, Map, Handshake, type LucideIcon } from 'lucide-react'
import { suggestName } from '../lib/profile'

interface Props {
  open: boolean
  firstVisit: boolean
  initialName: string
  onSave: (name: string) => void
  onClose: () => void
}

const STEPS: { Icon: LucideIcon; text: string }[] = [
  { Icon: Camera, text: 'Snap a photo — AI names it and estimates the CO₂ you save.' },
  { Icon: Map, text: 'It drops onto the neighbourhood map for people nearby.' },
  { Icon: Handshake, text: 'A neighbour reserves it and collects it. Landfill avoided.' },
]

export default function OnboardingModal({
  open,
  firstVisit,
  initialName,
  onSave,
  onClose,
}: Props) {
  const [name, setName] = useState(initialName)
  const [placeholder] = useState(suggestName())

  useEffect(() => setName(initialName), [initialName])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !firstVisit) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, firstVisit, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !firstVisit && onClose()}
    >
      <div
        className="w-full max-w-md animate-[fadeIn_0.25s_ease] rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-loop-500 text-white">
            <Recycle size={22} strokeWidth={2.4} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-loop-800">
              {firstVisit ? 'Welcome to ReLoop' : 'Your profile'}
            </h2>
            <p className="text-xs text-gray-500">
              Give it away, keep it local, keep it out of landfill
            </p>
          </div>
        </div>

        {firstVisit && (
          <ul className="mb-5 space-y-2.5">
            {STEPS.map((s) => (
              <li key={s.text} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-loop-100 text-loop-700">
                  <s.Icon size={15} strokeWidth={2.2} />
                </span>
                <span>{s.text}</span>
              </li>
            ))}
          </ul>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-500">
            What should neighbours call you?
          </span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholder}
            maxLength={24}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(name.trim() || placeholder)
            }}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-loop-400 focus:ring-2 focus:ring-loop-200"
          />
        </label>

        <button
          onClick={() => onSave(name.trim() || placeholder)}
          className="mt-4 w-full rounded-full bg-loop-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-loop-600 active:scale-[0.98]"
        >
          {firstVisit ? 'Start giving' : 'Save'}
        </button>
      </div>
    </div>
  )
}
