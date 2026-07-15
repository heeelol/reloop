import type { AiAnalysis, Category } from './types'
import { CATEGORIES, co2ForCategory } from './impact'

const FN_URL = import.meta.env.VITE_ANALYZE_URL as string | undefined
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Analyze a photo of an item: returns a suggested category, a title,
 * an estimated CO2e saved, and a short human reason.
 *
 * Primary path: a Supabase Edge Function running a Claude vision prompt that
 * returns structured JSON. If the backend isn't configured yet, we fall back
 * to a lightweight local heuristic so the UI is always demoable.
 */
export async function analyzePhoto(file: File): Promise<AiAnalysis> {
  if (FN_URL) {
    const dataUrl = await fileToDataUrl(file)
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}` } : {}),
      },
      body: JSON.stringify({ image: dataUrl }),
    })
    if (!res.ok) throw new Error(`Analyze failed: ${res.status}`)
    const json = (await res.json()) as Partial<AiAnalysis>
    return normalize(json, file)
  }
  return localFallback(file)
}

function normalize(json: Partial<AiAnalysis>, file: File): AiAnalysis {
  const category: Category = CATEGORIES.includes(json.category as Category)
    ? (json.category as Category)
    : 'Other'
  const condition =
    json.condition === 'like new' ||
    json.condition === 'good' ||
    json.condition === 'worn'
      ? json.condition
      : undefined
  const confidence =
    typeof json.confidence === 'number' && isFinite(json.confidence)
      ? Math.max(0, Math.min(1, json.confidence))
      : undefined
  return {
    category,
    title: json.title?.trim() || fileNameToTitle(file),
    co2Saved:
      typeof json.co2Saved === 'number' && json.co2Saved > 0
        ? Math.round(json.co2Saved * 10) / 10
        : co2ForCategory(category),
    reason: json.reason?.trim() || 'Estimated from item category.',
    condition,
    confidence,
  }
}

async function localFallback(file: File): Promise<AiAnalysis> {
  // Simulate model latency so the UX matches the real path.
  await new Promise((r) => setTimeout(r, 1100))
  const name = file.name.toLowerCase()
  const guess: [RegExp, Category][] = [
    [/chair|table|desk|sofa|couch|shelf|drawer/, 'Furniture'],
    [/tv|monitor|laptop|phone|cable|charger|console/, 'Electronics'],
    [/coat|shirt|jacket|shoe|dress|cloth/, 'Clothing'],
    [/book|dvd|cd|magazine/, 'Books & Media'],
    [/toy|lego|game|puzzle|doll/, 'Toys & Games'],
    [/pan|pot|mixer|kettle|plate|mug|kitchen/, 'Kitchen'],
    [/plant|pot|garden|seed|tool/, 'Garden'],
  ]
  const matched = guess.find(([re]) => re.test(name))?.[1]
  const category = matched ?? 'Other'
  return {
    category,
    title: fileNameToTitle(file),
    co2Saved: co2ForCategory(category),
    reason: 'Demo estimate — connect the vision backend for a live analysis.',
    condition: 'good',
    // Filename heuristic → honest lower confidence when nothing matched.
    confidence: matched ? 0.72 : 0.4,
  }
}

function fileNameToTitle(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Item to give away'
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
