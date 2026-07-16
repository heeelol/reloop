import type { Category } from './types'

export const CATEGORIES: Category[] = [
  'Furniture',
  'Electronics',
  'Clothing',
  'Books & Media',
  'Toys & Games',
  'Kitchen',
  'Garden',
  'Other',
]

// Rough kg CO2e avoided by reusing an item instead of buying new + diverting it
// from landfill. Figures are conservative midpoints drawn from lifecycle-analysis
// literature (WRAP, EPA WARM) and are meant as illustrative estimates.
export const CO2_PER_CATEGORY: Record<Category, number> = {
  Furniture: 25,
  Electronics: 30,
  Clothing: 8,
  'Books & Media': 1.5,
  'Toys & Games': 3,
  Kitchen: 6,
  Garden: 10,
  Other: 5,
}

export function co2ForCategory(c: Category): number {
  return CO2_PER_CATEGORY[c] ?? CO2_PER_CATEGORY.Other
}

export function formatCo2(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`
  if (kg >= 100) return `${Math.round(kg)} kg`
  return `${kg.toFixed(kg < 10 ? 1 : 0)} kg`
}

// Fun, relatable CO₂ equivalents. Each factor is kg CO₂e per unit, drawn from
// published sources where possible (EPA GHG Equivalencies for driving, phone
// charges and tree sequestration; lifecycle studies for burgers/flights) so the
// numbers stay defensible. `icon` keys into EQUIVALENT_ICON (see lib/icons).
export interface Equivalent {
  icon: string
  text: string
}

interface Factor {
  icon: string
  kgEach: number
  label: string
}

const FACTORS: Factor[] = [
  { icon: 'tree', kgEach: 6, label: 'trees soaking up CO₂ for a year' },
  { icon: 'car', kgEach: 0.393, label: 'miles not driven' },
  { icon: 'burger', kgEach: 3, label: 'beef burgers’ worth of emissions' },
  { icon: 'shower', kgEach: 0.5, label: 'hot showers' },
  { icon: 'coffee', kgEach: 0.2, label: 'cups of coffee' },
  { icon: 'stream', kgEach: 0.055, label: 'hours of video streamed' },
  { icon: 'balloon', kgEach: 0.014, label: 'party balloons filled with CO₂' },
  { icon: 'phone', kgEach: 0.0124, label: 'phone charges' },
  { icon: 'flight', kgEach: 250, label: 'short-haul flights' },
  { icon: 'caryear', kgEach: 4290, label: 'cars taken off the road for a year' },
]

const PHONE = FACTORS[7]

function fmtCount(n: number): string {
  if (n >= 10) return Math.round(n).toLocaleString()
  return n.toFixed(1)
}

function render({ icon, label }: Factor, n: number): Equivalent {
  return { icon, text: `≈ ${fmtCount(n)} ${label}` }
}

// A single, human-friendly equivalent — prefers a value in a relatable range
// (2–500) so we never show "0.3 trees" or "104,838 phone charges".
export function co2Equivalent(kg: number): Equivalent {
  if (kg <= 0) return { icon: PHONE.icon, text: `≈ 0 ${PHONE.label}` }
  const options = FACTORS.map((e) => ({ e, n: kg / e.kgEach })).filter(
    ({ n }) => n >= 1,
  )
  const nice = options.find(({ n }) => n >= 2 && n <= 500) ?? options[0]
  if (nice) return render(nice.e, nice.n)
  // Below every factor's threshold — fall back to phone charges (finest grain).
  return render(PHONE, kg / PHONE.kgEach)
}

// The full set of equivalents that land on a sensible number, for the rotating
// community-impact banner. Ordered as listed above (trees & driving first).
export function co2Equivalents(kg: number): Equivalent[] {
  if (kg <= 0) return []
  const out = FACTORS.map((e) => ({ e, n: kg / e.kgEach }))
    .filter(({ n }) => n >= 1 && n < 100000)
    .map(({ e, n }) => render(e, n))
  return out.length ? out : [co2Equivalent(kg)]
}
