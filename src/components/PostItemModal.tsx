import { useRef, useState } from 'react'
import type { AiAnalysis, Category, Item } from '../lib/types'
import { CATEGORIES, CATEGORY_EMOJI, co2Equivalent, formatCo2 } from '../lib/impact'
import { analyzePhoto } from '../lib/ai'
import { compressImage } from '../lib/image'

interface Props {
  userLoc: [number, number] | null
  onClose: () => void
  onSubmit: (
    item: Omit<Item, 'id' | 'createdAt' | 'status'>,
    file: File | null,
  ) => void
}

export default function PostItemModal({ userLoc, onClose, onSubmit }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [ai, setAi] = useState<AiAnalysis | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('Other')
  const [co2, setCo2] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(raw: File) {
    const selected = await compressImage(raw)
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setAnalyzing(true)
    setAi(null)
    try {
      const result = await analyzePhoto(selected)
      setAi(result)
      setTitle(result.title)
      setCategory(result.category)
      setCo2(result.co2Saved)
    } finally {
      setAnalyzing(false)
    }
  }

  function submit() {
    if (!preview || !title.trim() || !userLoc) return
    // Scatter the drop point slightly so exact home address isn't pinned.
    const jitter = () => (Math.random() - 0.5) * 0.004
    onSubmit(
      {
        title: title.trim(),
        description: description.trim() || 'Free to a good home.',
        category,
        imageUrl: preview,
        lat: userLoc[0] + jitter(),
        lng: userLoc[1] + jitter(),
        locationName: 'Near you',
        co2Saved: co2,
        ownerName: 'You',
      },
      file,
    )
  }

  const canSubmit = !!preview && !!title.trim() && !!userLoc && !analyzing

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-base font-bold text-loop-800">Give something away</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          {/* Photo drop zone */}
          <button
            onClick={() => inputRef.current?.click()}
            className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-loop-200 bg-loop-50 transition hover:border-loop-400"
          >
            {preview ? (
              <img src={preview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <div className="text-center text-sm text-loop-700">
                <div className="mb-1 text-3xl">📷</div>
                Tap to add a photo
                <div className="text-xs text-loop-600">
                  Our AI will identify it and estimate the CO₂ you save
                </div>
              </div>
            )}
            {analyzing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-loop-200 border-t-loop-600" />
                <span className="text-sm font-medium text-loop-700">
                  Analyzing photo…
                </span>
              </div>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />

          {/* AI result card */}
          {ai && (
            <div className="animate-[fadeIn_0.3s_ease] rounded-xl border border-loop-200 bg-loop-50 p-3.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-loop-700">
                <span>✨ AI analysis</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">
                  {CATEGORY_EMOJI[ai.category]} {ai.category}
                </span>
                <span className="rounded-full bg-loop-600 px-2.5 py-0.5 text-xs font-bold text-white">
                  saves {formatCo2(ai.co2Saved)} CO₂
                </span>
              </div>
              <p className="mt-1 text-xs text-loop-700">{ai.reason}</p>
              <p className="text-[11px] text-loop-600">{co2Equivalent(ai.co2Saved)}</p>
            </div>
          )}

          {/* Editable fields */}
          {preview && (
            <div className="space-y-3">
              <Field label="Title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What is it?"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-loop-400 focus:ring-2 focus:ring-loop-200"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Condition, pickup notes…"
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-loop-400 focus:ring-2 focus:ring-loop-200"
                />
              </Field>
              <Field label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-loop-400 focus:ring-2 focus:ring-loop-200"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_EMOJI[c]} {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {!userLoc && preview && (
            <p className="text-xs text-amber-600">
              Enable location to post — we place your item near you (never your exact address).
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 p-4">
          <button
            disabled={!canSubmit}
            onClick={submit}
            className="w-full rounded-full bg-loop-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-loop-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Post give-away
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-500">{label}</span>
      {children}
    </label>
  )
}
